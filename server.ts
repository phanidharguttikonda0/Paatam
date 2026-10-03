import express, { Express, Request, Response } from "express";
import pinoHttp from "pino-http";
import { logger } from "./src/config/logger";
import apiRoutes from "./src/routes/index";
import { errorHandler } from "./src/middlewares/errorHandler";

const app: Express = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware for structured logging of HTTP requests
app.use(pinoHttp({ logger }));

// Mount main API routes
app.use("/api", apiRoutes);

// Health Endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler must be the last middleware
app.use(errorHandler);

const PORT = process.env.PORT || 4545;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});