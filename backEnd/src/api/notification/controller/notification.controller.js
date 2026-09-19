import { StatusCodes } from "http-status-codes";
import {
  getNotificationsService,
  markAllNotificationsAsReadService,
  markNotificationAsReadService,
} from "../service/notification.service.js";

const getNotificationsController = async (req, res, next) => {
  try {
    const result = await getNotificationsService(req.user.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Notifications fetched successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const markNotificationAsReadController = async (req, res, next) => {
  try {
    await markNotificationAsReadService({
      notificationId: req.params.notificationId,
      userId: req.user.id,
    });
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error) {
    next(error);
  }
};

const markAllNotificationsAsReadController = async (req, res, next) => {
  try {
    await markAllNotificationsAsReadService(req.user.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Notifications marked as read.",
    });
  } catch (error) {
    next(error);
  }
};

export {
  getNotificationsController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
};
