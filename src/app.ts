import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import router from "./routes";
import { apiKeyAuth } from "./middleware/apiKeyAuth";

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes (API key required)
app.use("/api", apiKeyAuth, router);

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
