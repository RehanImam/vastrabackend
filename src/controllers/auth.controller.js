import crypto from "crypto";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import jwt from "jsonwebtoken";
import { forgotPasswordMailGenContent, sendMail, emailVerificationMailGenContent, resendVerificationMailGenContent, emailChangeVerificationMailGenContent } from "../utils/mail.js";

const FRONTEND_URL = (
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === "production" ? "https://vastrafrontend.vercel.app" : "http://localhost:3000")
).replace(/\/+$/, "");

// --- Helper: generate access + refresh tokens and save refresh token to DB ---
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
    
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
    
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
};
const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
};

// ========================
// REGISTER
// ========================
// ========================
// REGISTER
// ========================
const registerUser = asyncHandler(async (req, res) => {
    const { email, password, username } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    const existingUser = await User.findOne({
        $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
        throw new ApiError(409, "User with this email or username already exists");
    }

    // 1. Instantiate the user first (do NOT use User.prototype)
    const adminEmail = (process.env.ADMIN_EMAIL || "shopowner@ellegancesuit.com").toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "123456789";

    const user = new User({
        email: normalizedEmail,
        password,
        username: normalizedUsername,
        loginType: "EMAIL_PASSWORD",
        isEmailVerified: false,
        isAdmin: normalizedEmail === adminEmail || (normalizedEmail === adminEmail && password === adminPassword),
    });

    // 2. Generate the token using the instance
    const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();

    // 3. Attach token data to the user object
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;

    // 4. Save the user to the database
    await user.save();
    // --- MAIL INTEGRATION START ---
    const verificationUrl = `${FRONTEND_URL}/verify-email/${unHashedToken}`;

    const mailResult = await sendMail({
        email: user.email,
        subject: "Verify your email - Elegance Suit",
        mailGenContent: emailVerificationMailGenContent(user.username, verificationUrl),
    });

    if (mailResult.status === "error") {
        console.warn("Verification email could not be sent for:", user.email, mailResult.message);
    }
    // --- MAIL INTEGRATION END ---

    // 5. Fetch the created user without sensitive fields
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                user: createdUser,
                emailVerificationToken: unHashedToken, // Remove this in production
            },
            "User registered successfully. Please verify your email."
        )
    );
});

// ========================
// LOGIN
// ========================
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const adminEmail = (process.env.ADMIN_EMAIL || "shopowner@ellegancesuit.com").toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "123456789";

    let user = await User.findOne({ email: normalizedEmail });

    if (normalizedEmail === adminEmail && password === adminPassword) {
        if (!user) {
            user = await User.create({
                username: "shopowner",
                email: adminEmail,
                password: adminPassword,
                loginType: "EMAIL_PASSWORD",
                isEmailVerified: true,
                isAdmin: true,
            });
        } else {
            user.username = user.username || "shopowner";
            user.password = adminPassword;
            user.loginType = "EMAIL_PASSWORD";
            user.isEmailVerified = true;
            user.isAdmin = true;
            await user.save({ validateBeforeSave: false });
        }
    }

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    if (user.loginType !== "EMAIL_PASSWORD") {
        throw new ApiError(
            400,
            `You signed up with ${user.loginType.toLowerCase().replace("_", " ")}. Please use that to login.`
        );
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } =
        await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry"
    );

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
});

// ========================
// LOGOUT
// ========================
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: true }
    );


    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// ========================
// REFRESH ACCESS TOKEN
// ========================
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const { accessToken, refreshToken: newRefreshToken } =
            await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", newRefreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

// ========================
// VERIFY EMAIL
// ========================
const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params;

    if (!token) {
        throw new ApiError(400, "Email verification token is required");
    }

    // Hash the incoming token to compare with stored hash
    const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: { $gt: Date.now() },
    });

    if (!user) {
        throw new ApiError(400, "Token is invalid or has expired");
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, { isEmailVerified: true }, "Email verified successfully"));
});

// ========================
// FORGOT PASSWORD REQUEST
// ========================
const forgotPasswordRequest = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "No user found with this email");
    }

    if (user.loginType !== "EMAIL_PASSWORD") {
        throw new ApiError(
            400,
            `You signed up with ${user.loginType.toLowerCase().replace("_", " ")}. Password reset is not available.`
        );
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
        user.generateTemporaryToken();

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordExpiry = tokenExpiry;
    await user.save({ validateBeforeSave: false });

    // --- MAIL INTEGRATION START ---
    const passwordResetUrl = `${FRONTEND_URL}/reset-password/${unHashedToken}`;

    await sendMail({
        email: user.email,
        subject: "Reset your password - Elegance Suit",
        mailGenContent: forgotPasswordMailGenContent(user.username, passwordResetUrl),
    });
    // --- MAIL INTEGRATION END ---

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Password reset link sent to your email."
        )
    );
});

// ========================
// RESET FORGOTTEN PASSWORD
// ========================
const resetForgottenPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token) {
        throw new ApiError(400, "Reset token is required");
    }

    const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const user = await User.findOne({
        forgotPasswordToken: hashedToken,
        forgotPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
        throw new ApiError(400, "Token is invalid or has expired");
    }

    user.password = newPassword;
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;
    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password reset successfully"));
});

// ========================
// CHANGE CURRENT PASSWORD (authenticated)
// ========================
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordValid) {
        throw new ApiError(400, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// ========================
// GET CURRENT USER (authenticated)
// ========================
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// ========================
// GOOGLE OAUTH CALLBACK HANDLER
// ========================
const handleGoogleCallback = asyncHandler(async (req, res) => {
    // Passport attaches the user to req.user after successful authentication
    const user = req.user;

    const { accessToken, refreshToken } =
        await generateAccessAndRefreshTokens(user._id);

    // Redirect to the frontend; the HTTP-only cookies carry the session.
    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .redirect(FRONTEND_URL);
});
// ========================
// RESEND EMAIL VERIFICATION
// ========================
const resendEmailVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
        throw new ApiError(404, "User with this email does not exist");
    }

    if (user.isEmailVerified) {
        throw new ApiError(400, "Email is already verified");
    }

    // Generate new verification token
    const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;
    await user.save({ validateBeforeSave: false });

    // Construct verification link
    const verificationUrl = `${FRONTEND_URL}/verify-email/${unHashedToken}`;

    // Send email using Resend
    await sendMail({
        email: user.email,
        subject: "Resend Email Verification - Elegance Suit",
        mailGenContent: resendVerificationMailGenContent(user.username, verificationUrl),
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Verification email resent successfully. Please check your inbox."
        )
    );
});

// ========================
// UPDATE PROFILE (username, gender)
// ========================
const updateProfile = asyncHandler(async (req, res) => {
    const { username, gender } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // If username is being changed, check uniqueness
    if (username && username !== user.username) {
        const normalizedUsername = username.trim().toLowerCase();
        const existingUser = await User.findOne({ username: normalizedUsername });
        if (existingUser) {
            throw new ApiError(409, "Username is already taken");
        }
        user.username = normalizedUsername;
    }

    if (gender) {
        user.gender = gender;
    }

    await user.save({ validateBeforeSave: false });

    const updatedUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry"
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

// ========================
// CHANGE EMAIL (with verification)
// ========================
const changeEmail = asyncHandler(async (req, res) => {
    const { newEmail } = req.body;
    const normalizedEmail = newEmail.trim().toLowerCase();

    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (normalizedEmail === user.email) {
        throw new ApiError(400, "New email is the same as your current email");
    }

    // Check if new email is already taken by another user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        throw new ApiError(409, "This email is already registered to another account");
    }

    // Update email and mark as unverified
    user.email = normalizedEmail;
    user.isEmailVerified = false;

    // Generate verification token
    const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false });

    // Send verification email to the NEW email
    const verificationUrl = `${FRONTEND_URL}/verify-email/${unHashedToken}`;

    await sendMail({
        email: normalizedEmail,
        subject: "Verify your new email - Elegance Suit",
        mailGenContent: emailChangeVerificationMailGenContent(user.username, verificationUrl),
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Email updated. Please verify your new email address."));
});

export {
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
};