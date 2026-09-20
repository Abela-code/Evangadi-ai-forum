import { safeExecute } from "../../../../schema/db.config.js";
import { NotFoundError } from "../../../utility/errors/errors.js";

const getQuestionReference = async (questionIdentifier) => {
  if (!questionIdentifier) {
    throw new NotFoundError("Question not found");
  }

  const isHash = Number.isNaN(Number(questionIdentifier));
  const sql = isHash
    ? `
      SELECT q.question_id AS id, q.question_hash AS questionHash, q.title, q.content, q.category,
             q.user_id AS userId, u.first_name AS firstName, u.last_name AS lastName
      FROM questions q
      JOIN users u ON u.user_id = q.user_id
      WHERE q.question_hash = ?
      LIMIT 1
    `
    : `
      SELECT q.question_id AS id, q.question_hash AS questionHash, q.title, q.content, q.category,
             q.user_id AS userId, u.first_name AS firstName, u.last_name AS lastName
      FROM questions q
      JOIN users u ON u.user_id = q.user_id
      WHERE q.question_id = ?
      LIMIT 1
    `;

  const rows = await safeExecute(sql, [questionIdentifier]);

  if (rows.length === 0) {
    throw new NotFoundError("Question not found");
  }

  return rows[0];
};

const getBookmarkStatusService = async ({ userId, questionIdentifier }) => {
  const question = await getQuestionReference(questionIdentifier);

  const rows = await safeExecute(
    "SELECT bookmark_id FROM bookmarks WHERE user_id = ? AND question_id = ? LIMIT 1",
    [userId, question.id],
  );

  return {
    bookmarked: rows.length > 0,
    question: {
      id: question.id,
      questionHash: question.questionHash,
      title: question.title,
      content: question.content,
      category: question.category,
    },
  };
};

const createBookmarkService = async ({ userId, questionIdentifier }) => {
  const question = await getQuestionReference(questionIdentifier);

  try {
    await safeExecute(
      "INSERT INTO bookmarks (user_id, question_id) VALUES (?, ?)",
      [userId, question.id],
    );
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return {
        bookmarked: true,
        question: {
          id: question.id,
          questionHash: question.questionHash,
          title: question.title,
          content: question.content,
          category: question.category,
        },
      };
    }

    throw error;
  }

  return {
    bookmarked: true,
    question: {
      id: question.id,
      questionHash: question.questionHash,
      title: question.title,
      content: question.content,
      category: question.category,
    },
  };
};

const deleteBookmarkService = async ({ userId, questionIdentifier }) => {
  const question = await getQuestionReference(questionIdentifier);

  const result = await safeExecute(
    "DELETE FROM bookmarks WHERE user_id = ? AND question_id = ?",
    [userId, question.id],
  );

  return {
    removed: result.affectedRows > 0,
    bookmarked: false,
    question: {
      id: question.id,
      questionHash: question.questionHash,
      title: question.title,
      content: question.content,
      category: question.category,
    },
  };
};

const getUserBookmarksService = async ({ userId }) => {
  const listSql = `
    SELECT
      q.question_id AS id,
      q.question_hash AS questionHash,
      q.title,
      q.content,
      q.category,
      q.created_at AS createdAt,
      q.updated_at AS updatedAt,
      u.user_id AS userId,
      u.first_name AS firstName,
      u.last_name AS lastName,
      COUNT(DISTINCT a.answer_id) AS answerCount,
      1 AS isBookmarked
    FROM bookmarks b
    JOIN questions q ON q.question_id = b.question_id
    JOIN users u ON u.user_id = q.user_id
    LEFT JOIN answers a ON a.question_id = q.question_id
    WHERE b.user_id = ?
    GROUP BY q.question_id, u.user_id
    ORDER BY b.created_at DESC
  `;

  const rows = await safeExecute(listSql, [userId]);

  return {
    data: rows.map((question) => ({
      id: question.id,
      questionHash: question.questionHash,
      title: question.title,
      content: question.content,
      category: question.category,
      answerCount: question.answerCount,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      isBookmarked: Boolean(question.isBookmarked),
      author: {
        id: question.userId,
        firstName: question.firstName,
        lastName: question.lastName,
      },
    })),
    meta: {
      total: rows.length,
      sortBy: "bookmarkedAt",
      sortOrder: "DESC",
    },
  };
};

export {
  createBookmarkService,
  deleteBookmarkService,
  getBookmarkStatusService,
  getUserBookmarksService,
};
