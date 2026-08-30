import {
  applicationEventResponseSchema,
  applicationIdParamsSchema,
  createApplicationEventRequestSchema,
} from "@applyr/contracts";
import type { Request, Response } from "express";

import { HttpError } from "../../errors/http-error.js";
import { parseRequest } from "../../http/parse-request.js";
import * as applicationEventService from "./application-event.service.js";

export async function createApplicationEvent(
  req: Request,
  res: Response,
): Promise<void> {
  const { applicationId } = parseRequest(
    applicationIdParamsSchema,
    req.params,
    "params",
  );
  const requestBody = parseRequest(
    createApplicationEventRequestSchema,
    req.body,
    "body",
  );
  const event = await applicationEventService.createApplicationEvent(
    applicationId,
    requestBody,
  );

  if (event === null) {
    throw new HttpError(404, "NOT_FOUND", "Application not found");
  }

  const responseBody = applicationEventResponseSchema.parse({
    data: event,
  });

  res.status(201).json(responseBody);
}
