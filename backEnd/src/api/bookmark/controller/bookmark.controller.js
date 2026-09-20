import { StatusCodes } from "http-status-codes";
import {
  createBookmarkService,
  deleteBookmarkService,
  getBookmarkStatusService,
  getUserBookmarksService,
} from "../service/bookmark.service.js";

const createBookmarkController = async (req, res, next) => {
  try {
    const result = await createBookmarkService({
      userId: req.user.id,
      questionIdentifier: req.params.questionId,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Question saved.",
      bookmarked: result.bookmarked,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteBookmarkController = async (req, res, next) => {
  try {
    const result = await deleteBookmarkService({
      userId: req.user.id,
      questionIdentifier: req.params.questionId,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Bookmark removed.",
      bookmarked: result.bookmarked,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getBookmarkStatusController = async (req, res, next) => {
  try {
    const result = await getBookmarkStatusService({
      userId: req.user.id,
      questionIdentifier: req.params.questionId,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Bookmark status retrieved.",
      bookmarked: result.bookmarked,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getUserBookmarksController = async (req, res, next) => {
  try {
    const result = await getUserBookmarksService({ userId: req.user.id });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Saved questions retrieved.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export {
  createBookmarkController,
  deleteBookmarkController,
  getBookmarkStatusController,
  getUserBookmarksController,
};
