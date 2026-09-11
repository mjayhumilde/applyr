import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { authEnv } from "../config/auth-env.js";
import { env } from "../config/env.js";
import { HttpError } from "../errors/http-error.js";

const ipSchema = z.union([z.ipv4(), z.ipv6()]);

export function trustedClientIp(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  let clientIp = req.socket.remoteAddress;

  if (env.NODE_ENV === "production") {
    const received = Buffer.from(req.get("x-applyr-proxy-secret") ?? "");
    const expected = Buffer.from(authEnv.PROXY_SHARED_SECRET ?? "");

    if (
      expected.length === 0 ||
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new HttpError(403, "FORBIDDEN", "Open Applyr to access its API");
    }

    clientIp = req.get("x-applyr-client-ip");
  }

  const parsed = ipSchema.safeParse(clientIp);
  if (!parsed.success) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Unable to identify this request; try again through Applyr",
    );
  }

  // Always overwrite browser-supplied values; Better Auth trusts only this header.
  req.headers["x-applyr-client-ip"] = parsed.data;
  delete req.headers["x-applyr-proxy-secret"];
  next();
}
