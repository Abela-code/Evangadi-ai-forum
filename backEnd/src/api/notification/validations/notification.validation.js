import { param } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

const notificationIdValidation = [
  param("notificationId")
    .isInt({ min: 1 })
    .withMessage("Notification id must be a positive integer")
    .toInt(),
  validationErrorHandler,
];

export { notificationIdValidation };
