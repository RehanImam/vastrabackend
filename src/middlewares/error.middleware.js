import { ApiError } from "../utils/api-error.js";

/**
 * Global error handler middleware.
 * Must be registered AFTER all routes in app.js.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    let error = err;

    // If the error is not an instance of ApiError, wrap it
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Something went wrong";
        error = new ApiError(statusCode, message, error?.errors || []);
    }

    const response = {
        statusCode: error.statusCode,
        message: error.message,
        success: false,
        errors: error.errors,
        // Include stack trace only in development
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    };

    return res.status(error.statusCode).json(response);
};

export { errorHandler };
