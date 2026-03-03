import express from "express";
import cors from "cors";
import helmet from "helmet";
import router from "./routes";
import { apiKeyAuth } from "./middleware/apiKeyAuth";
import path from "path";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api", apiKeyAuth, router);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const frontendPath = path.join(
  __dirname,
  process.env.NODE_ENV === "production"
    ? "../frontend/dist"
    : "../../frontend/dist",
);
app.use(express.static(frontendPath));

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

export default app;
