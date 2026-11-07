import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import { fileURLToPath } from "node:url";


dotenv.config({
    path: fileURLToPath(new URL("../.env", import.meta.url)),
});



// 2. Import passport strategy config BEFORE routes (registers the "google" strategy)
import "../src/config/passport.config.js";

import { errorHandler } from "../src/middlewares/error.middleware.js";
import connectDB from "../src/db/index.js";
import healthcheckrouter from "../src/routes/healthcheck.routes.js";
import authRouter from "../src/routes/auth.routes.js";
import orderRouter from "../src/routes/order.routes.js";
import productRouter from "../src/routes/product.routes.js";
import { cloudinaryConnect } from "../src/config/cloudinary.config.js";

const app = express();

let connectionsPromise;
const ensureConnections = () => {
    if (!connectionsPromise) {
        connectionsPromise = (async () => {
            await connectDB();
            await cloudinaryConnect();
        })().catch((error) => {
            connectionsPromise = undefined;
            throw error;
        });
    }

    return connectionsPromise;
};

app.use(async (req, res, next) => {
    try {
        await ensureConnections();
        next();
    } catch (err) {
        console.error("Service connection error:", err);
        res.status(500).json({ status: "error", message: "Service connection failed" });
    }
});

// 4. Global Middlewares
app.use(cors({
    origin: ["http://localhost:3000", "https://ellegancesuit.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Cookie", "X-Access-Token"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(passport.initialize());

// 5. Routes
app.get("/", (req, res) => {
    res.json({ status: "success", message: "Auth backend is running perfectly!" });
});
app.use("/api/v1/healthcheck", healthcheckrouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1", orderRouter);
app.use("/api/v1", productRouter);

// 6. Global Error Middleware
app.use(errorHandler);

// 7. Local Server Execution (Ignored by Vercel, used for localhost)
const PORT = process.env.PORT || 8000;
if (!process.env.VERCEL) {
    ensureConnections()
        .then(() => {
            app.listen(PORT, () => {
                console.log(`Server is running at ${PORT}`);
            });
        })
        .catch((error) => {
            console.error("Server startup failed:", error);
            process.exitCode = 1;
        });
}

// 8. CRITICAL: Export app for Vercel Serverless environment
export default app;
