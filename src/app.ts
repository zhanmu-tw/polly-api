import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import router from "./routes";
import { apiKeyAuth } from "./middleware/apiKeyAuth";
import path from "path";

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

// Serve frontend static content
const frontendPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

export default app;
