import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import {
  getNotificationsController,
  markAllNotificationsAsReadController,
  markNotificationAsReadController,
} from "../controller/notification.controller.js";
import { notificationIdValidation } from "../validations/notification.validation.js";

const notificationRouter = express.Router();

notificationRouter.use(authenticateUser);
notificationRouter.get("/", getNotificationsController);
notificationRouter.patch("/read-all", markAllNotificationsAsReadController);
notificationRouter.patch(
  "/:notificationId/read",
  notificationIdValidation,
  markNotificationAsReadController,
);

export { notificationRouter };
