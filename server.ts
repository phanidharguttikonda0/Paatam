import express, { Express, Request, Response } from "express";
import { initOpenTelemetry, metricsMiddleware, getPrometheusMetrics } from "./src/config/instrumentation";

// Initialize OpenTelemetry SDK before Express handles requests
initOpenTelemetry();

import pinoHttp from "pino-http";
import { logger } from "./src/config/logger";
import apiRoutes from "./src/routes/index";
import { errorHandler } from "./src/middlewares/errorHandler";

import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import fs from "fs";

const app: Express = express();

// Configure CORS for frontend cross-origin requests & credentials
app.use(cors({
  origin: (origin, callback) => {
    // Allows localhost (Vite/Next/React) and custom frontend domains
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse cookies
app.use(cookieParser());

// Middleware for Prometheus Golden Signal metrics (Throughput, Latencies, Error rates)
app.use(metricsMiddleware);

// Middleware for structured logging of HTTP requests
app.use(pinoHttp({ logger }));

// Prometheus scrape endpoint for AWS Managed Prometheus (AMP) / ADOT sidecar
app.get("/metrics", async (_req: Request, res: Response) => {
  try {
    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.end(await getPrometheusMetrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

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