import express, { type Express } from "express";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import { applicationRouter } from "./modules/applications/application.route.js";
import { healthRouter } from "./modules/health/health.route.js";

export function createApp(): Express {
  const app = express();

  // security: avoid framework leak(we're running express)
  app.disable("x-powered-by");

  // core middleware
  app.use(express.json({ limit: "100kb" }));

  // routes
  app.use("/api/health", healthRouter);
  app.use("/api/applications", applicationRouter);

  // fallback middleware: these must stay after all routes
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
