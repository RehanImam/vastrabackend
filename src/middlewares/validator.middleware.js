import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";

export const validatorMiddleware = (req, res, next) => {
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
        return next();
    }

    // Directly map the errors into the desired object structure
    const extractedErrors = errors.array().map((err) => ({
        [err.path]: err.msg,
    }));

    return res
        .status(422)
        .json(new ApiError(422, "Received data is not valid", extractedErrors));
};