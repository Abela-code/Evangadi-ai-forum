import express from "express";

import {
  createDocumentController,
  deleteDocumentController,
  getDocumentFileController,
  getDocumentMetaController,
  listDocumentsController,
  queryDocumentController,
  searchInDocumentController,
} from "../controller/rag.controller.js";

import {
  documentIdParamValidation,
  queryDocumentValidation,
  searchInDocumentValidation,
} from "../validations/rag.validation.js";

import {
  createDocumentMulterErrorHandler,
  ragUpload,
} from "../config/rag.upload.config.js";

import { authenticateUser } from "../../../middleware/authentication.js";

const ragRouter = express.Router();

// Every document belongs to one user, so nothing here is public.
ragRouter.use(authenticateUser);

/**
 * @route POST /api/rag/documents
 * @desc Upload a PDF, chunk it, and embed every chunk
 * @access Protected
 */
ragRouter.post(
  "/documents",
  ragUpload.single("file"),
  createDocumentMulterErrorHandler,
  createDocumentController,
);

/**
 * @route GET /api/rag/documents
 * @desc List the authenticated user's documents, newest first
 * @access Protected
 */
ragRouter.get("/documents", listDocumentsController);

/**
 * @route GET /api/rag/documents/:documentId/search
 * @desc Rank this document's chunks against a query
 * @access Protected
 */
ragRouter.get(
  "/documents/:documentId/search",
  searchInDocumentValidation,
  searchInDocumentController,
);

/**
 * @route GET /api/rag/documents/:documentId/file
 * @desc Stream the stored PDF for inline preview
 * @access Protected
 */
ragRouter.get(
  "/documents/:documentId/file",
  documentIdParamValidation,
  getDocumentFileController,
);

/**
 * @route POST /api/rag/documents/:documentId/query
 * @desc Answer a question using only this document's text
 * @access Protected
 */
ragRouter.post(
  "/documents/:documentId/query",
  queryDocumentValidation,
  queryDocumentController,
);

/**
 * @route GET /api/rag/documents/:documentId
 * @desc Processing status and metadata for one document
 * @access Protected
 */
ragRouter.get(
  "/documents/:documentId",
  documentIdParamValidation,
  getDocumentMetaController,
);

/**
 * @route DELETE /api/rag/documents/:documentId
 * @desc Remove the document, its file, and its chunks
 * @access Protected
 */
ragRouter.delete(
  "/documents/:documentId",
  documentIdParamValidation,
  deleteDocumentController,
);

export { ragRouter };
