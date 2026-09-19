import { safeExecute } from "../../../../schema/db.config.js";
import {
  NotFoundError,
  UnauthenticatedError,
} from "../../../utility/errors/errors.js";

const mapNotification = (row) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  message: row.message,
  questionHash: row.questionHash,
  questionTitle: row.questionTitle,
  actor: {
    id: row.actorId,
    firstName: row.actorFirstName,
    lastName: row.actorLastName,
  },
  isRead: Boolean(row.isRead),
  createdAt: row.createdAt,
});

const createNewAnswerNotification = async ({
  questionHash,
  questionOwnerId,
  answererId,
  answererName,
}) => {
  if (questionOwnerId === answererId) return;

  await safeExecute(
    `INSERT INTO notifications
      (user_id, type, title, message, question_hash, actor_user_id)
     VALUES (?, 'NEW_ANSWER', 'New answer', ?, ?, ?)`,
    [
      questionOwnerId,
      `${answererName} answered your question`,
      questionHash,
      answererId,
    ],
  );
};

const getNotificationsService = async (userId) => {
  const rows = await safeExecute(
    `SELECT
      n.notification_id AS id,
      n.type,
      n.title,
      n.message,
      n.question_hash AS questionHash,
      q.title AS questionTitle,
      n.is_read AS isRead,
      n.created_at AS createdAt,
      actor.user_id AS actorId,
      actor.first_name AS actorFirstName,
      actor.last_name AS actorLastName
    FROM notifications n
    JOIN questions q ON q.question_hash = n.question_hash
    JOIN users actor ON actor.user_id = n.actor_user_id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50`,
    [userId],
  );
  const unreadRows = await safeExecute(
    "SELECT COUNT(*) AS unreadCount FROM notifications WHERE user_id = ? AND is_read = FALSE",
    [userId],
  );

  return {
    notifications: rows.map(mapNotification),
    unreadCount: Number(unreadRows[0].unreadCount),
  };
};

const markNotificationAsReadService = async ({ notificationId, userId }) => {
  const result = await safeExecute(
    "UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?",
    [notificationId, userId],
  );

  if (result.affectedRows === 0) {
    const rows = await safeExecute(
      "SELECT notification_id FROM notifications WHERE notification_id = ? LIMIT 1",
      [notificationId],
    );

    if (rows.length === 0) throw new NotFoundError("Notification not found");
    throw new UnauthenticatedError(
      "You are not authorized to update this notification",
    );
  }
};

const markAllNotificationsAsReadService = async (userId) => {
  await safeExecute(
    "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE",
    [userId],
  );
};

export {
  createNewAnswerNotification,
  getNotificationsService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService,
};
