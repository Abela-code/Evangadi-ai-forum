import { safeExecute } from "../../../../schema/db.config.js";
import {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
} from "../../../utility/errors/errors.js";
import { createNewAnswerNotification } from "../../notification/service/notification.service.js";

/**
 * Maps a raw database row to a structured answer object.
 * @param {Object} row - The database row containing answer and user data.
 * @returns {Object} The formatted answer object.
 */
const mapAnswer = (row) => ({
  id: row.id,
  questionId: row.questionId,
  content: row.content,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  author: {
    id: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
  },
});

/**
 * Retrieves the owner of a specific question.
 * Throws a NotFoundError if the question does not exist.
 * @param {number|string} questionId - The ID of the question.
 * @returns {Promise<Object>} An object containing question_id and user_id.
 * @throws {NotFoundError} If the question is not found.
 */
const getQuestionOwner = async (questionId) => {
  const rows = await safeExecute(
    "SELECT question_id, question_hash, user_id FROM questions WHERE question_id = ? LIMIT 1",
    [questionId],
  );
  if (rows.length === 0) {
    throw new NotFoundError("Question not found");
  }
  return rows[0];
};

/**
 * Creates a new answer for a specific question.
 * Validates that the user is not answering their own question.
 * @param {Object} params - The answer creation parameters.
 * @param {number|string} params.questionId - The ID of the question being answered.
 * @param {number|string} params.userId - The ID of the user creating the answer.
 * @param {string} params.content - The content of the answer.
 * @returns {Promise<Object>} The newly created answer object.
 * @throws {BadRequestError} If the user attempts to answer their own question.
 */
const createAnswerService = async ({ questionId, userId, content }) => {
  const question = await getQuestionOwner(questionId);
  if (question.user_id === userId) {
    throw new BadRequestError("You cannot answer your own question");
  }

  const insertSql =
    "INSERT INTO answers (question_id, user_id, content) VALUES (?, ?, ?)";
  const result = await safeExecute(insertSql, [questionId, userId, content]);

  try {
    const answererRows = await safeExecute(
      "SELECT first_name, last_name FROM users WHERE user_id = ? LIMIT 1",
      [userId],
    );
    const answerer = answererRows[0];

    await createNewAnswerNotification({
      questionHash: question.question_hash,
      questionOwnerId: question.user_id,
      answererId: userId,
      answererName: `${answerer.first_name} ${answerer.last_name}`,
    });
  } catch (error) {
    console.error("Could not create answer notification:", error);
  }

  return getSingleAnswerService(result.insertId);
};

/**
 * Generates the SQL ORDER BY clause for answers based on the sort criteria.
 * @param {string} sortBy - The sort criteria ('newest' or 'oldest').
 * @returns {string} The SQL ORDER BY string.
 */
const getAnswerSortSql = (sortBy) => {
  if (sortBy === "oldest") {
    return "a.created_at ASC";
  }
  return "a.created_at DESC";
};

/**
 * Retrieves a list of answers for a specific question.
 * @param {Object} params - The search parameters.
 * @param {number|string} params.questionId - The ID of the question.
 * @param {string} [params.sortBy='newest'] - The sort order ('newest' or 'oldest').
 * @returns {Promise<Object>} An object containing the list of answers and pagination metadata.
 */
const getAnswersService = async ({ questionId, sortBy = "newest" }) => {
  await getQuestionOwner(questionId);

  const normalizedLimit = 100; // Fixed max 100 records
  const sortClause = getAnswerSortSql(sortBy);

  const listSql = `
    SELECT
      a.answer_id AS id,
      a.question_id AS questionId,
      a.content,
      a.created_at AS createdAt,
      a.updated_at AS updatedAt,
      u.user_id AS userId,
      u.first_name AS firstName,
      u.last_name AS lastName
    FROM answers a
    JOIN users u ON u.user_id = a.user_id
    WHERE a.question_id = ?
    ORDER BY ${sortClause}
    LIMIT ${normalizedLimit}
  `;
  const rows = await safeExecute(listSql, [questionId]);

  return {
    data: rows.map(mapAnswer),
    meta: {
      limit: normalizedLimit,
      total: rows.length,
      sortBy,
    },
  };
};

/**
 * Retrieves a single answer by its ID.
 * @param {number|string} answerId - The ID of the answer.
 * @returns {Promise<Object>} The formatted answer object.
 * @throws {NotFoundError} If the answer is not found.
 */
const getSingleAnswerService = async (answerId) => {
  const sql = `
    SELECT
      a.answer_id AS id,
      a.question_id AS questionId,
      a.content,
      a.created_at AS createdAt,
      a.updated_at AS updatedAt,
      u.user_id AS userId,
      u.first_name AS firstName,
      u.last_name AS lastName
    FROM answers a
    JOIN users u ON u.user_id = a.user_id
    WHERE a.answer_id = ?
    LIMIT 1
  `;
  const rows = await safeExecute(sql, [answerId]);
  if (rows.length === 0) {
    throw new NotFoundError("Answer not found");
  }
  return mapAnswer(rows[0]);
};

/**
 * Retrieves the owner of a specific answer.
 * @param {number|string} answerId - The ID of the answer.
 * @returns {Promise<Object>} An object containing answer_id and user_id.
 * @throws {NotFoundError} If the answer is not found.
 */
const getAnswerOwner = async (answerId) => {
  const rows = await safeExecute(
    "SELECT answer_id, user_id FROM answers WHERE answer_id = ? LIMIT 1",
    [answerId],
  );
  if (rows.length === 0) {
    throw new NotFoundError("Answer not found");
  }
  return rows[0];
};

/**
 * Updates an existing answer.
 * Validates that the requesting user is the owner of the answer.
 * @param {Object} params - The update parameters.
 * @param {number|string} params.answerId - The ID of the answer to update.
 * @param {number|string} params.userId - The ID of the user attempting the update.
 * @param {string} params.content - The new content for the answer.
 * @returns {Promise<Object>} The updated answer object.
 * @throws {UnauthenticatedError} If the user is not the owner of the answer.
 */
const updateAnswerService = async ({ answerId, userId, content }) => {
  const answer = await getAnswerOwner(answerId);
  if (answer.user_id !== userId) {
    throw new UnauthenticatedError(
      "You are not authorized to update this answer",
    );
  }

  await safeExecute(
    "UPDATE answers SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE answer_id = ?",
    [content, answerId],
  );
  return getSingleAnswerService(answerId);
};

/**
 * Deletes an existing answer.
 * Validates that the requesting user is the owner of the answer.
 * @param {Object} params - The deletion parameters.
 * @param {number|string} params.answerId - The ID of the answer to delete.
 * @param {number|string} params.userId - The ID of the user attempting the deletion.
 * @returns {Promise<Object>} An object containing the ID of the deleted answer.
 * @throws {UnauthenticatedError} If the user is not the owner of the answer.
 */
const deleteAnswerService = async ({ answerId, userId }) => {
  const answer = await getAnswerOwner(answerId);
  if (answer.user_id !== userId) {
    throw new UnauthenticatedError(
      "You are not authorized to delete this answer",
    );
  }

  await safeExecute("DELETE FROM answers WHERE answer_id = ?", [answerId]);
  return { id: answerId };
};

export {
  createAnswerService,
  getAnswersService,
  getSingleAnswerService,
  updateAnswerService,
  deleteAnswerService,
};
