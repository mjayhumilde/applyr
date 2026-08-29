import express, { type Express } from "express";

import { healthRouter } from "./modules/health/health.route.js";
import { applicationRouter } from "./modules/applications/application.route.js";

export function createApp(): Express {
  const app = express();

  // security: avoid framework leak(we're running express)
  app.disable("x-powered-by");

  // core middleware
  app.use(express.json());

  // routes
  app.use("/api/health", healthRouter);
  app.use("/api/applications", applicationRouter);

  return app;
}
