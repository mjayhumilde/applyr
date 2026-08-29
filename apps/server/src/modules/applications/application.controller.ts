import {
  applicationIdParamsSchema,
  applicationListResponseSchema,
  applicationResponseSchema,
  createApplicationRequestSchema,
  updateApplicationRequestSchema,
} from "@applyr/contracts";
import type { Request, Response } from "express";

import { HttpError } from "../../errors/http-error.js";
import { parseRequest } from "../../http/parse-request.js";
import * as applicationService from "./application.service.js";

export async function getApplications(
  _req: Request,
  res: Response,
): Promise<void> {
  const applications = await applicationService.listApplications();

  const responseBody = applicationListResponseSchema.parse({
    data: applications,
  });

  res.status(200).json(responseBody);
}

export async function getApplication(
  req: Request,
  res: Response,
): Promise<void> {
  const { applicationId } = parseRequest(
    applicationIdParamsSchema,
    req.params,
    "params",
  );
  const application = await applicationService.getApplication(applicationId);

  if (application === null) {
    throw new HttpError(404, "NOT_FOUND", "Application not found");
  }

  const responseBody = applicationResponseSchema.parse({
    data: application,
  });

  res.status(200).json(responseBody);
}

export async function createApplication(
  req: Request,
  res: Response,
): Promise<void> {
  const requestBody = parseRequest(
    createApplicationRequestSchema,
    req.body,
    "body",
  );
  const application = await applicationService.createApplication(requestBody);

  const responseBody = applicationResponseSchema.parse({
    data: application,
  });

  res
    .location(`/api/applications/${application.id}`)
    .status(201)
    .json(responseBody);
}

export async function updateApplication(
  req: Request,
  res: Response,
): Promise<void> {
  const { applicationId } = parseRequest(
    applicationIdParamsSchema,
    req.params,
    "params",
  );
  const requestBody = parseRequest(
    updateApplicationRequestSchema,
    req.body,
    "body",
  );
  const application = await applicationService.updateApplication(
    applicationId,
    requestBody,
  );

  if (application === null) {
    throw new HttpError(404, "NOT_FOUND", "Application not found");
  }

  const responseBody = applicationResponseSchema.parse({
    data: application,
  });

  res.status(200).json(responseBody);
}

export async function deleteApplication(
  req: Request,
  res: Response,
): Promise<void> {
  const { applicationId } = parseRequest(
    applicationIdParamsSchema,
    req.params,
    "params",
  );
  const wasDeleted = await applicationService.deleteApplication(applicationId);

  if (!wasDeleted) {
    throw new HttpError(404, "NOT_FOUND", "Application not found");
  }

  res.status(204).send();
}
