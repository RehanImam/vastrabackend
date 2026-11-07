import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const verifyJWT = asyncHandler(async (req, _res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Unauthorised request");
    }

    try {
        const decodedToken = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry"
        );

        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("JWT Error:", error);
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});

export const requireAdmin = (req, _res, next) => {
    const adminEmail = (process.env.ADMIN_EMAIL || "shopowner@ellegancesuit.com").toLowerCase();
    const isAdmin = Boolean(req.user?.isAdmin) || req.user?.email?.toLowerCase() === adminEmail;

    if (!isAdmin) {
        return next(new ApiError(403, "Access denied. Admin only."));
    }

    next();
};