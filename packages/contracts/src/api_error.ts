import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "INTERNAL_SERVER_ERROR",
]);

const apiErrorIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string().trim().min(1),
});

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().trim().min(1),
    issues: z.array(apiErrorIssueSchema).optional(),
  }),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
