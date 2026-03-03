import { Request, Response, NextFunction } from "express";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.API_KEY;
  const getApiKey = process.env.GET_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "API_KEY not configured on server" });
    return;
  }

  const provided = req.header("X-API-Key");

  if (!provided) {
    res.status(401).json({ error: "Unauthorized: missing API key" });
    return;
  }

  if (provided === apiKey) {
    next();
    return;
  }

  if (getApiKey && provided === getApiKey && req.method === "GET") {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized: invalid API key" });
}
