import express from "express";
import {
  createBookmarkController,
  deleteBookmarkController,
  getBookmarkStatusController,
  getUserBookmarksController,
} from "../controller/bookmark.controller.js";
import { authenticateUser } from "../../../middleware/authentication.js";

const bookmarkRouter = express.Router();

bookmarkRouter.use(authenticateUser);

bookmarkRouter.post("/:questionId", createBookmarkController);
bookmarkRouter.delete("/:questionId", deleteBookmarkController);
bookmarkRouter.get("/:questionId", getBookmarkStatusController);
bookmarkRouter.get("/", getUserBookmarksController);

export { bookmarkRouter };
