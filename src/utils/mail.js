import Mailgen from "mailgen";
import { Resend } from "resend";

const validateEmailConfig = () => {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const senderEmail = process.env.SENDER_EMAIL?.trim();

    if (!apiKey || !senderEmail) {
        return {
            ok: false,
            message: "Email service is not configured. Set RESEND_API_KEY and SENDER_EMAIL in Backend/.env before sending emails.",
        };
    }

    return { ok: true };
};

const createResendClient = () => {
    const { ok, message } = validateEmailConfig();

    if (!ok) {
        console.error("Email config error:", message);
        return null;
    }

    return new Resend(process.env.RESEND_API_KEY.trim());
};

const sendMail = async (options) => {
    const configCheck = validateEmailConfig();
    if (!configCheck.ok) {
        console.error("Email config error:", configCheck.message);
        return { status: "error", message: configCheck.message };
    }

    const resend = createResendClient();

    if (!resend) {
        return { status: "error", message: "Email service unavailable" };
    }

    const mailGenerator = new Mailgen({
        theme: 'default',
        product: {
            name: 'Elegance Suit',
            link: 'https://ellegancesuit.vercel.app'
        }
    });

    const emailText = mailGenerator.generatePlaintext(options.mailGenContent);
    const emailHtml = mailGenerator.generate(options.mailGenContent);

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.SENDER_EMAIL,
            to: options.email,
            subject: options.subject,
            text: emailText,
            html: emailHtml,
        });

        if (error) {
            console.error("Email Error:", error);
            return { status: "error", message: error.message };
        }

        return { status: "success", message: "Mail sent successfully", data };
    } catch (error) {
        console.error("Email Error:", error);
        return { status: "error", message: error.message };
    }
};

const emailVerificationMailGenContent = (username, verificationUrl) => {
    return {
        body: {
            name: username,
            intro: "You are just one step away from joining Elegance Suit!",
            action: {
                instructions: "Please verify your email by clicking the button below:",
                button: {
                    color: '#22BC66',
                    text: "Verify Email",
                    link: verificationUrl
                }
            },
            outro: "If you did not create this account, please ignore this email."
        }
    };
};

const resendVerificationMailGenContent = (username, verificationUrl) => {
    return {
        body: {
            name: username,
            intro: "You requested to resend your verification email for Elegance Suit.",
            action: {
                instructions: "Click the button below to verify your email address:",
                button: {
                    color: '#22BC66',
                    text: "Verify Email",
                    link: verificationUrl
                }
            },
            outro: "This link will expire soon. If you did not request a new link, please ignore this email."
        }
    };
};

const forgotPasswordMailGenContent = (username, passwordResetUrl) => {
    return {
        body: {
            name: username,
            intro: "Reset Your Password",
            action: {
                instructions: "You can reset your password by clicking the button below:",
                button: {
                    color: '#DC4D41',
                    text: "Reset Password",
                    link: passwordResetUrl
                }
            },
            outro: "If you did not request a password reset, please ignore this email."
        }
    };
};

const emailChangeVerificationMailGenContent = (username, verificationUrl) => {
    return {
        body: {
            name: username,
            intro: "You requested to change your email address for your Elegance Suit account.",
            action: {
                instructions: "Please verify your new email address by clicking the button below:",
                button: {
                    color: '#22BC66',
                    text: "Verify New Email",
                    link: verificationUrl
                }
            },
            outro: "If you did not request this change, please ignore this email. Your old email will remain active."
        }
    };
};

export {
    sendMail,
    validateEmailConfig,
    emailVerificationMailGenContent,
    resendVerificationMailGenContent,
    forgotPasswordMailGenContent,
    emailChangeVerificationMailGenContent,
};