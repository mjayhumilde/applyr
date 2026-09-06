import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";

import { auth } from "../auth/auth.js";
import { HttpError } from "../errors/http-error.js";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { response: session, headers } = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
    returnHeaders: true,
  });

  // Forward refreshed/expired cookies from the server-side session check.
  for (const cookie of headers.getSetCookie()) {
    res.append("Set-Cookie", cookie);
  }

  if (session === null) {
    throw new HttpError(401, "UNAUTHORIZED", "Sign in to continue");
  }

  req.authSession = session;
  next();
}
