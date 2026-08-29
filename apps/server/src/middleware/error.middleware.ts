import type { ApiErrorCode, ApiErrorResponse } from "@applyr/contracts";
import type { NextFunction, Request, Response } from "express";

import { HttpError } from "../errors/http-error.js";

type ApiErrorIssues = ApiErrorResponse["error"]["issues"];

export function notFoundHandler(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(new HttpError(404, "NOT_FOUND", "Route not found"));
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (isMalformedJsonError(error)) {
    sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Request body contains invalid JSON",
      [{ path: ["body"], message: "Invalid JSON syntax" }],
    );
    return;
  }

  if (isPayloadTooLargeError(error)) {
    sendError(res, 413, "VALIDATION_ERROR", "Request body is too large", [
      { path: ["body"], message: "JSON body must not exceed 100kb" },
    ]);
    return;
  }

  if (error instanceof HttpError) {
    sendError(res, error.statusCode, error.code, error.message, error.issues);
    return;
  }

  logUnexpectedError(error, req);

  sendError(res, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred");
}

function isPayloadTooLargeError(error: unknown): error is Error & {
  status: 413;
  type: "entity.too.large";
} {
  if (!(error instanceof Error)) {
    return false;
  }

  const candidate = error as Error & {
    status?: unknown;
    type?: unknown;
  };

  return candidate.status === 413 && candidate.type === "entity.too.large";
}

function isMalformedJsonError(error: unknown): error is SyntaxError & {
  status: 400;
  type: "entity.parse.failed";
} {
  if (!(error instanceof SyntaxError)) {
    return false;
  }

  const candidate = error as SyntaxError & {
    status?: unknown;
    type?: unknown;
  };

  return candidate.status === 400 && candidate.type === "entity.parse.failed";
}

function sendError(
  res: Response,
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  issues?: ApiErrorIssues,
): void {
  const responseBody: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(issues ? { issues } : {}),
    },
  };

  res.status(statusCode).json(responseBody);
}

function logUnexpectedError(error: unknown, req: Request): void {
  if (error instanceof Error) {
    console.error("Unhandled request error", {
      method: req.method,
      path: req.path,
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return;
  }

  console.error("Unhandled non-Error value", {
    method: req.method,
    path: req.path,
    valueType: typeof error,
  });
}
