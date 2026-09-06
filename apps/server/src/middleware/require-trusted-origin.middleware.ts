import type { NextFunction, Request, Response } from "express";

import { trustedOrigins } from "../config/auth-env.js";
import { HttpError } from "../errors/http-error.js";

export function requireTrustedOrigin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  // Cookies alone are not enough: writes must come from our app's origin.
  const origin = req.get("origin");

  if (origin === undefined || !trustedOrigins.includes(origin)) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Open Applyr and try again; this request's origin is not allowed",
    );
  }

  next();
}
