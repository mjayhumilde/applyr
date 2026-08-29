import { applicationListResponseSchema } from "@applyr/contracts";
import type { Request, Response } from "express";

import { listApplications } from "./application.service.js";

export async function getApplications(
  _req: Request,
  res: Response,
): Promise<void> {
  const applications = await listApplications();

  const responseBody = applicationListResponseSchema.parse({
    data: applications,
  });

  res.status(200).json(responseBody);
}
