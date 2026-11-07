/**
 * Wraps an async Express route handler to catch errors
 * and forward them to the Express error handler via next().
 */
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};

export { asyncHandler };
