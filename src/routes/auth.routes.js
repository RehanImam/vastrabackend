import { Router } from "express";
import passport from "passport";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    verifyEmail,
    forgotPasswordRequest,
    resetForgottenPassword,
    changeCurrentPassword,
    resendEmailVerification,
    getCurrentUser,
    handleGoogleCallback,
    updateProfile,
    changeEmail,
} from "../controllers/auth.controller.js";
import { validatorMiddleware } from "../middlewares/validator.middleware.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import {
    userRegistrationValidator,
    userLoginValidator,
    changePasswordValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    updateProfileValidator,
    changeEmailValidator,
} from "../utils/validator.js";

const router = Router();

// --- Public Routes (no auth required) ---
router.route("/register").post(userRegistrationValidator(), validatorMiddleware, registerUser);
router.route("/login").post(userLoginValidator(), validatorMiddleware, loginUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/verify-email/:token").get(verifyEmail);
router.route("/forgot-password").post(forgotPasswordValidator(), validatorMiddleware, forgotPasswordRequest);
router.route("/reset-password/:token").post(resetPasswordValidator(), validatorMiddleware, resetForgottenPassword);
router.route("/resend-verification").post(forgotPasswordValidator(), validatorMiddleware, resendEmailVerification);

// --- Google OAuth Routes ---
router.route("/google").get(
    passport.authenticate("google", {
        scope: ["profile", "email"],
        session: false,
    })
);
router.route("/google/callback").get(
    passport.authenticate("google", {
        session: false,
        failureRedirect: "/api/v1/auth/google/failure",
    }),
    handleGoogleCallback
);
router.route("/google/failure").get((_req, res) => {
    return res.status(401).json({ success: false, message: "Google authentication failed" });
});

// --- Protected Routes (auth required) ---
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changePasswordValidator(), validatorMiddleware, changeCurrentPassword);
router.route("/me").get(verifyJWT, getCurrentUser);
router.route("/profile").patch(verifyJWT, updateProfileValidator(), validatorMiddleware, updateProfile);
router.route("/change-email").patch(verifyJWT, changeEmailValidator(), validatorMiddleware, changeEmail);

export default router;