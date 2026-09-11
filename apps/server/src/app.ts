import express, { type Express } from "express";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./auth/auth.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import { requireAuth } from "./middleware/require-auth.middleware.js";
import { requireTrustedOrigin } from "./middleware/require-trusted-origin.middleware.js";
import { trustedClientIp } from "./middleware/trusted-client-ip.middleware.js";
import { applicationRouter } from "./modules/applications/application.route.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.route.js";
import { healthRouter } from "./modules/health/health.route.js";

export function createApp(): Express {
  const app = express();

  // security: avoid framework leak(we're running express)
  app.disable("x-powered-by");

  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.use("/api", trustedClientIp);

  // Better Auth reads the raw request stream, so it must precede express.json.
  app.all("/api/auth/*splat", requireTrustedOrigin, toNodeHandler(auth));
  app.use("/api/health", healthRouter);

  // All other API routes require a verified session; writes also check origin.
  app.use("/api", requireAuth, requireTrustedOrigin);
  app.use(express.json({ limit: "100kb" }));

  app.use("/api/applications", applicationRouter);
  app.use("/api/dashboard", dashboardRouter);

  // fallback middleware: these must stay after all routes
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp();
