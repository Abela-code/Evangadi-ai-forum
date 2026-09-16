import fs from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

import { safeExecute } from "../../../../schema/db.config.js";
import {
  BadRequestError,
  NotFoundError,
} from "../../../utility/errors/errors.js";
import {
  calculateCosineSimilarity,
  generateQuestionEmbedding,
} from "../../question/service/vector.service.js";
import { answerFromRagChunksService } from "../../question/service/geminiTextCoach.service.js";
import {
  RAG_UPLOAD_DIR,
  resolveStoragePath,
} from "../config/rag.upload.config.js";

const CHUNK_CHARS = Number(process.env.RAG_CHUNK_CHARS) || 1000;
const CHUNK_OVERLAP = Number(process.env.RAG_CHUNK_OVERLAP) || 150;
const MAX_CHUNKS_PER_DOC = Number(process.env.RAG_MAX_CHUNKS_PER_DOC) || 1000;
const MAX_PDFS_PER_USER = Number(process.env.RAG_MAX_PDFS_PER_USER) || 20;
const MIN_TEXT_CHARS = Number(process.env.RAG_MIN_TEXT_CHARS) || 50;
const SEARCH_THRESHOLD = Number(process.env.RAG_SEARCH_THRESHOLD) || 0.45;
const SEARCH_K = Number(process.env.RAG_SEARCH_K) || 10;

/** Shape returned for a documents row, matching the task file's JSON. */
const mapDocument = (row, { includePrivate = false } = {}) => ({
  document_id: row.document_id,
  title: row.title,
  mime_type: row.mime_type,
  byte_size: Number(row.byte_size),
  status: row.status,
  error_message: row.error_message,
  created_at: row.created_at,
  updated_at: row.updated_at,
  ...(includePrivate
    ? { user_id: row.user_id, storage_path: row.storage_path }
    : {}),
});

/**
 * Fetch a document and prove the caller owns it. A document belonging to
 * someone else is reported as 404, not 403 — the caller should not learn that
 * the id exists at all.
 */
export const assertOwnedDocument = async (documentId, userId) => {
  const rows = await safeExecute(
    `SELECT document_id, user_id, title, mime_type, storage_path, byte_size,
            status, error_message, created_at, updated_at
       FROM documents
      WHERE document_id = ? AND user_id = ?
      LIMIT 1`,
    [documentId, userId],
  );

  if (rows.length === 0) throw new NotFoundError("Document not found");

  return rows[0];
};

/**
 * Slice text into overlapping windows. The overlap matters: without it a
 * sentence that straddles a boundary is in neither chunk cleanly and stops
 * being retrievable. Windows break on whitespace so words stay whole.
 */
export const chunkText = (text) => {
  const clean = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
  const chunks = [];
  let start = 0;

  while (start < clean.length && chunks.length < MAX_CHUNKS_PER_DOC) {
    let end = Math.min(start + CHUNK_CHARS, clean.length);

    if (end < clean.length) {
      // Prefer to cut at the last space in the window rather than mid-word.
      const lastSpace = clean.lastIndexOf(" ", end);
      if (lastSpace > start + CHUNK_CHARS * 0.5) end = lastSpace;
    }

    const content = clean.slice(start, end).trim();
    if (content) chunks.push({ content, start, end });

    if (end >= clean.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks;
};

/** Map a character offset back to the PDF page it came from. */
const buildPageIndex = (pages) => {
  const index = [];
  let offset = 0;

  for (const page of pages ?? []) {
    const text = (page.text ?? "").replace(/\r\n/g, "\n");
    index.push({ num: page.num, start: offset, end: offset + text.length });
    offset += text.length + 1; // +1 for the newline joining pages
  }

  return index;
};

const pageAt = (pageIndex, offset) => {
  const hit = pageIndex.find((p) => offset >= p.start && offset <= p.end);
  return hit ? hit.num : null;
};

const extractPdfText = async (absolutePath) => {
  const parser = new PDFParse({ data: await fs.readFile(absolutePath) });

  try {
    const result = await parser.getText();
    return { text: result.text ?? "", pages: result.pages ?? [] };
  } catch (error) {
    // A file that is not really a PDF, is corrupt, or is password protected is
    // the caller's problem, not a server fault — report it as 400, not 500.
    throw new BadRequestError(
      `Could not read this PDF (${error?.message ?? "unknown error"}). It may be corrupted or password protected.`,
    );
  } finally {
    await parser.destroy().catch(() => {});
  }
};

/**
 * Upload pipeline: record the document, parse it, chunk it, embed every chunk,
 * then mark it ready. The row is inserted before the slow work so the document
 * is visible as 'processing', and any failure is written back to that row
 * rather than vanishing.
 */
export const createDocumentFromUploadService = async ({ userId, file }) => {
  if (!file) throw new BadRequestError("A PDF file is required.");

  const storagePath = path
    .relative(path.resolve(RAG_UPLOAD_DIR), file.path)
    .replace(/\\/g, "/");

  const [{ count }] = await safeExecute(
    "SELECT COUNT(*) AS count FROM documents WHERE user_id = ?",
    [userId],
  );

  if (count >= MAX_PDFS_PER_USER) {
    await fs.unlink(file.path).catch(() => {});
    throw new BadRequestError(
      `You can keep at most ${MAX_PDFS_PER_USER} documents. Delete one first.`,
    );
  }

  const insert = await safeExecute(
    `INSERT INTO documents (user_id, title, mime_type, storage_path, byte_size, status)
     VALUES (?, ?, ?, ?, ?, 'processing')`,
    [userId, file.originalname, file.mimetype, storagePath, file.size],
  );

  const documentId = insert.insertId;

  try {
    const { text, pages } = await extractPdfText(file.path);

    if (text.trim().length < MIN_TEXT_CHARS) {
      throw new BadRequestError(
        "No readable text found in this PDF. Scanned images need OCR first.",
      );
    }

    const pageIndex = buildPageIndex(pages);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new BadRequestError("The PDF produced no usable text chunks.");
    }

    for (const [chunkIndex, chunk] of chunks.entries()) {
      const chunkRow = await safeExecute(
        `INSERT INTO document_chunks
           (document_id, chunk_index, content, page_start, page_end)
         VALUES (?, ?, ?, ?, ?)`,
        [
          documentId,
          chunkIndex,
          chunk.content,
          pageAt(pageIndex, chunk.start),
          pageAt(pageIndex, chunk.end),
        ],
      );

      // Same embedding call the forum uses for questions, so chunks and
      // questions share a model and dimensionality.
      const { embedding } = await generateQuestionEmbedding(chunk.content, {
        taskType: "RETRIEVAL_DOCUMENT",
      });

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error(`Gemini returned no embedding for chunk ${chunkIndex}`);
      }

      await safeExecute(
        `INSERT INTO document_chunk_vectors (chunk_id, source_text, embedding, status)
         VALUES (?, ?, ?, 'ready')`,
        [chunkRow.insertId, chunk.content, JSON.stringify(embedding)],
      );
    }

    await safeExecute(
      "UPDATE documents SET status = 'ready', error_message = NULL WHERE document_id = ?",
      [documentId],
    );

    const [row] = await safeExecute(
      `SELECT document_id, user_id, title, mime_type, storage_path, byte_size,
              status, error_message, created_at, updated_at
         FROM documents WHERE document_id = ?`,
      [documentId],
    );

    return {
      document: mapDocument(row, { includePrivate: true }),
      chunks: chunks.length,
    };
  } catch (error) {
    // Record why it failed so the row explains itself in the documents list.
    await safeExecute(
      "UPDATE documents SET status = 'failed', error_message = ? WHERE document_id = ?",
      [
        String(error?.message ?? "Processing failed").slice(0, 1000),
        documentId,
      ],
    ).catch(() => {});

    throw error;
  }
};

export const listDocumentsForUserService = async (userId) => {
  const rows = await safeExecute(
    `SELECT document_id, title, mime_type, byte_size, status, error_message,
            created_at, updated_at
       FROM documents
      WHERE user_id = ?
      ORDER BY created_at DESC`,
    [userId],
  );

  return rows.map((row) => mapDocument(row));
};

export const getDocumentMetaService = async ({ documentId, userId }) => {
  const row = await assertOwnedDocument(documentId, userId);
  return mapDocument(row, { includePrivate: true });
};

export const getDocumentFilePathService = async ({ documentId, userId }) => {
  const row = await assertOwnedDocument(documentId, userId);
  const absolutePath = resolveStoragePath(row.storage_path);

  try {
    await fs.access(absolutePath);
  } catch {
    throw new NotFoundError("The stored PDF file is missing from the server.");
  }

  return { absolutePath, title: row.title };
};

/**
 * Rank this document's chunks against a query. Same maths as forum semantic
 * search, scoped to one document's vectors.
 */
export const searchInDocumentService = async ({
  documentId,
  userId,
  query,
  k = 5,
}) => {
  const document = await assertOwnedDocument(documentId, userId);

  if (document.status !== "ready") {
    throw new BadRequestError(
      `This document is '${document.status}', so it cannot be searched yet.`,
    );
  }

  const { embedding: queryVector } = await generateQuestionEmbedding(query, {
    taskType: "RETRIEVAL_QUERY",
  });

  const rows = await safeExecute(
    `SELECT c.chunk_id, c.chunk_index, c.content, c.page_start, c.page_end,
            v.embedding
       FROM document_chunks c
       JOIN document_chunk_vectors v ON v.chunk_id = c.chunk_id
      WHERE c.document_id = ? AND v.status = 'ready'`,
    [documentId],
  );

  const scored = [];

  for (const row of rows) {
    const stored =
      typeof row.embedding === "string"
        ? JSON.parse(row.embedding)
        : row.embedding;

    if (!Array.isArray(stored) || stored.length !== queryVector.length)
      continue;

    const score = calculateCosineSimilarity(queryVector, stored);
    if (score >= SEARCH_THRESHOLD) {
      scored.push({
        chunkId: row.chunk_id,
        chunkIndex: row.chunk_index,
        pageStart: row.page_start,
        pageEnd: row.page_end,
        content: row.content,
        score: Number(score.toFixed(6)),
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return {
    query,
    results: scored.slice(0, Math.min(k, SEARCH_K)).map((hit) => ({
      chunkId: hit.chunkId,
      chunkIndex: hit.chunkIndex,
      pageStart: hit.pageStart,
      pageEnd: hit.pageEnd,
      score: hit.score,
      excerpt: hit.content,
    })),
  };
};

/**
 * Retrieval-augmented answer: find the best chunks, then let Gemini answer
 * using only those. The chunks come back as citations so the answer can be
 * checked against the source.
 */
export const queryDocumentService = async ({ documentId, userId, query }) => {
  const { results } = await searchInDocumentService({
    documentId,
    userId,
    query,
    k: 5,
  });

  if (results.length === 0) {
    return {
      answer:
        "I could not find anything in this document that answers that question.",
      citations: [],
      chunksUsed: [],
    };
  }

  const { answer } = await answerFromRagChunksService({
    query,
    chunks: results.map((hit, index) => ({
      ref: index + 1,
      text: hit.excerpt,
    })),
  });

  return {
    answer,
    citations: results.map((hit, index) => ({
      ref: index + 1,
      chunkIndex: hit.chunkIndex,
      pageStart: hit.pageStart,
    })),
    chunksUsed: results.map((hit) => hit.chunkId),
  };
};

export const deleteDocumentService = async ({ documentId, userId }) => {
  const document = await assertOwnedDocument(documentId, userId);

  // Remove the file first; a missing file should not block the row deletion.
  await fs.unlink(resolveStoragePath(document.storage_path)).catch((error) => {
    if (error?.code !== "ENOENT") {
      console.error("deleteDocumentService: could not remove file", error);
    }
  });

  // document_chunks and document_chunk_vectors cascade from the foreign keys.
  await safeExecute(
    "DELETE FROM documents WHERE document_id = ? AND user_id = ?",
    [documentId, userId],
  );

  return { id: documentId };
};
