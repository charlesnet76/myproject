import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import reminderRoutes from "./routes/reminder.routes.js";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

app.get("/api/ping", (req, res) => res.json({ message: "pong", version: "1.0.0" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reminders", reminderRoutes);

// MongoDB connection event listeners
mongoose.connection.on("connected", () => console.log("MongoDB connection established"));
mongoose.connection.on("disconnected", () => console.warn("MongoDB connection lost"));
mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected"));
mongoose.connection.on("error", (err) => console.error("MongoDB connection error:", err.message));

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
};

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

let server;

async function connectWithRetry(attempt = 1) {
  try {
    await mongoose.connect(process.env.MONGO_URI, MONGO_OPTIONS);
    server = app.listen(PORT, () => console.log(`Server started on PORT: ${PORT}`));
  } catch (err) {
    console.error(`MongoDB connect attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
    if (attempt >= MAX_RETRIES) {
      console.error("Max retries reached. Exiting.");
      process.exit(1);
    }
    const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
    console.log(`Retrying in ${delay / 1000}s...`);
    await new Promise((r) => setTimeout(r, delay));
    return connectWithRetry(attempt + 1);
  }
}

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed. Process exiting.");
      process.exit(0);
    });
  } else {
    await mongoose.connection.close();
    process.exit(0);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

connectWithRetry();
