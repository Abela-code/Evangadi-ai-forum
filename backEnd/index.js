// Loads .env before anything else.
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import { db } from "./schema/db.config.js";
import { mainRouter } from "./src/mainRoutes.js";
import { errorHandler, notFound } from "./src/middleware/error-handler.js";
import { PROFILE_UPLOAD_DIR } from "./src/api/profile/config/profile.upload.config.js";
import { warmQuestionTagEmbeddings } from "./src/api/question/service/question-tagging.service.js";

const app = express();

app.set("trust proxy", 1);

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const allowedOrigins = [
  "http://localhost:5173",
  "https://evangadi-ai-forum-pi.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(cookieParser());
app.use("/uploads/profiles", express.static(PROFILE_UPLOAD_DIR));

//Main api
app.use("/api", mainRouter);

app.use(notFound);
app.use(errorHandler);

// connection and server configuration
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const connection = await db.getConnection();
    connection.release();
    console.log("Connected to database");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      "Database connection failed. Server not started:",
      error.message,
    );
    process.exit(1);
  }
}

warmQuestionTagEmbeddings();
startServer();
