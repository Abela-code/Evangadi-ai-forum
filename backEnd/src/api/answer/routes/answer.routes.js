import express from "express";

import {
  createAnswerController,
  deleteAnswerController,
  getAnswersController,
  getSingleAnswerController,
  updateAnswerController,
} from "../controller/answer.controller.js";

import {
  answerIdValidation,
  createAnswerValidation,
  getAnswersValidation,
  updateAnswerValidation,
} from "../validations/answer.validation.js";

import { authenticateUser } from "../../../middleware/authentication.js";

const answerRouter = express.Router();

/**
 * @route POST /api/answers
 * @desc Post a new answer
 * @access Protected
 */
answerRouter.post(
  "/",
  authenticateUser,
  createAnswerValidation,
  createAnswerController,
);

/**
 * @route GET /api/answers
 * @desc Get answers for a question with pagination
 * @access Public
 */
answerRouter.get("/", getAnswersValidation, getAnswersController);

/**
 * @route GET /api/answers/:answerId
 * @desc Get one answer
 * @access Public
 */
answerRouter.get("/:answerId", answerIdValidation, getSingleAnswerController);

/**
 * @route PATCH /api/answers/:answerId
 * @desc Update one answer
 * @access Protected
 */
answerRouter.patch(
  "/:answerId",
  authenticateUser,
  updateAnswerValidation,
  updateAnswerController,
);

/**
 * @route DELETE /api/answers/:answerId
 * @desc Delete one answer
 * @access Protected
 */
answerRouter.delete(
  "/:answerId",
  authenticateUser,
  answerIdValidation,
  deleteAnswerController,
);

export { answerRouter };
