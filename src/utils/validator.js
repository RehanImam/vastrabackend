import { body } from "express-validator";

const userRegistrationValidator = () => {
    return [
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
        body("password")
            .trim()
            .notEmpty()
            .withMessage("Password is required")
            .isLength({ min: 4 })
            .withMessage("Password should be at least 4 characters")
            .isLength({ max: 12 })
            .withMessage("Password cannot exceed 12 characters"),
        body("username")
            .trim()
            .notEmpty()
            .withMessage("Username is required")
            .isLength({ min: 4 })
            .withMessage("Username should be at least 4 characters")
            .isLength({ max: 16 })
            .withMessage("Username cannot exceed 16 characters"),
    ];
};

const userLoginValidator = () => {
    return [
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
        body("password")
            .trim()
            .notEmpty()
            .withMessage("Password is required"),
    ];
};

const changePasswordValidator = () => {
    return [
        body("oldPassword")
            .trim()
            .notEmpty()
            .withMessage("Old password is required"),
        body("newPassword")
            .trim()
            .notEmpty()
            .withMessage("New password is required")
            .isLength({ min: 4 })
            .withMessage("New password should be at least 4 characters")
            .isLength({ max: 12 })
            .withMessage("New password cannot exceed 12 characters"),
    ];
};

const forgotPasswordValidator = () => {
    return [
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
    ];
};

const resetPasswordValidator = () => {
    return [
        body("newPassword")
            .trim()
            .notEmpty()
            .withMessage("New password is required")
            .isLength({ min: 4 })
            .withMessage("New password should be at least 4 characters")
            .isLength({ max: 12 })
            .withMessage("New password cannot exceed 12 characters"),
    ];
};

const updateProfileValidator = () => {
    return [
        body("username")
            .optional()
            .trim()
            .isLength({ min: 4 })
            .withMessage("Username should be at least 4 characters")
            .isLength({ max: 16 })
            .withMessage("Username cannot exceed 16 characters"),
        body("gender")
            .optional()
            .trim()
            .isIn(["Male", "Female", "Other"])
            .withMessage("Gender must be Male, Female, or Other"),
    ];
};

const changeEmailValidator = () => {
    return [
        body("newEmail")
            .trim()
            .notEmpty()
            .withMessage("New email is required")
            .isEmail()
            .withMessage("New email is invalid"),
    ];
};

export {
    userLoginValidator,
    userRegistrationValidator,
    changePasswordValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    updateProfileValidator,
    changeEmailValidator,
};