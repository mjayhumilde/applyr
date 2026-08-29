import type { ApiErrorCode, ApiErrorResponse } from "@applyr/contracts";

type ApiErrorIssues = ApiErrorResponse["error"]["issues"];

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly issues?: ApiErrorIssues,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
