import type { Request } from "express";

import { HttpError } from "../errors/http-error.js";

export function getAuthenticatedUserId(req: Request): string {
  const session = req.authSession;

  if (session === undefined) {
    throw new HttpError(401, "UNAUTHORIZED", "Sign in to continue");
  }

  return session.user.id;
}
