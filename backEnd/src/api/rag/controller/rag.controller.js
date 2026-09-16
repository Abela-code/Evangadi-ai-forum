import { StatusCodes } from "http-status-codes";
import {
  createDocumentFromUploadService,
  deleteDocumentService,
  getDocumentFilePathService,
  getDocumentMetaService,
  listDocumentsForUserService,
  queryDocumentService,
  searchInDocumentService,
} from "../service/rag.service.js";

/**
 * Handles uploading a PDF and building its chunk embeddings.
 */
export const createDocumentController = async (req, res, next) => {
  try {
    const { document } = await createDocumentFromUploadService({
      userId: req.user.id,
      file: req.file,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Document uploaded and processed.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles listing the authenticated user's documents, newest first.
 */
export const listDocumentsController = async (req, res, next) => {
  try {
    const data = await listDocumentsForUserService(req.user.id);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Documents fetched successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles fetching one document's processing status and metadata.
 */
export const getDocumentMetaController = async (req, res, next) => {
  try {
    const data = await getDocumentMetaService({
      documentId: req.params.documentId,
      userId: req.user.id,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Document fetched successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Streams the stored PDF back so the browser can preview it inline.
 */
export const getDocumentFileController = async (req, res, next) => {
  try {
    const { absolutePath, title } = await getDocumentFilePathService({
      documentId: req.params.documentId,
      userId: req.user.id,
    });

    res.type("application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(title)}"`,
    );

    res.sendFile(absolutePath, (error) => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles ranking a document's chunks against a search phrase.
 */
export const searchInDocumentController = async (req, res, next) => {
  try {
    const data = await searchInDocumentService({
      documentId: req.params.documentId,
      userId: req.user.id,
      query: req.query.query,
      k: req.query.k ? Number(req.query.k) : 5,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Ranked chunk excerpts",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles answering a question grounded in the document's own text.
 */
export const queryDocumentController = async (req, res, next) => {
  try {
    const data = await queryDocumentService({
      documentId: req.params.documentId,
      userId: req.user.id,
      query: req.body.query,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Answer and citations",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles removing a document, its file on disk, and its chunks.
 */
export const deleteDocumentController = async (req, res, next) => {
  try {
    const data = await deleteDocumentService({
      documentId: req.params.documentId,
      userId: req.user.id,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Document deleted successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};
