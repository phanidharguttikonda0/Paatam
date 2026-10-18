import express, { Express, Request, Response } from "express";
import pinoHttp from "pino-http";
import { logger } from "./src/config/logger";
import apiRoutes from "./src/routes/index";
import { errorHandler } from "./src/middlewares/errorHandler";

import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";

const app: Express = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse cookies
app.use(cookieParser());

// Middleware for structured logging of HTTP requests
app.use(pinoHttp({ logger }));

// Mount main API routes
app.use("/api", apiRoutes);

// Health Endpoint
app.get(["/health", "/api/health"], (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// Interactive Frontend API Documentation Endpoint
app.get(["/docs", "/api/docs"], (req: Request, res: Response) => {
  const docsPath = path.resolve(process.cwd(), "API_DOCUMENTATION_FOR_FRONTEND.html");
  if (fs.existsSync(docsPath)) {
    return res.sendFile(docsPath);
  }
  return res.status(404).send("API Documentation not found. Please run 'npm run generate:docs'.");
});

// Global Error Handler must be the last middleware, such that it catches all the errors thrown from the routes
app.use(errorHandler);

const PORT = process.env.PORT || 4545;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
}

export { app };