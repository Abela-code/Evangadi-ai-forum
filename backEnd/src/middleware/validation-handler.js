import { validationResult } from "express-validator";
import { BadRequestError } from "../utility/errors/errors.js";

const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    throw new BadRequestError(errorMessages.join(". "));
  }
  next();
};

export { validationErrorHandler };
