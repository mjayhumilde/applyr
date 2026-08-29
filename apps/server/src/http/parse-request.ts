import { z } from "zod";

import { HttpError } from "../errors/http-error.js";

type RequestSource = "body" | "params";

export function parseRequest<TSchema extends z.ZodType>(
  schema: TSchema,
  value: unknown,
  source: RequestSource,
): z.output<TSchema> {
  const result = schema.safeParse(value);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: [
        source,
        ...issue.path.map((segment) =>
          typeof segment === "number" ? segment : String(segment),
        ),
      ],
      message: issue.message,
    }));

    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Request validation failed",
      issues,
    );
  }

  return result.data;
}
