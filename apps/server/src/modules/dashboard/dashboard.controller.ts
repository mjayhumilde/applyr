import { dashboardSummaryResponseSchema } from "@applyr/contracts";
import type { Request, Response } from "express";

import { getAuthenticatedUserId } from "../../auth/get-authenticated-user-id.js";
import * as dashboardService from "./dashboard.service.js";

export async function getDashboardSummary(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = getAuthenticatedUserId(req);
  const summary = await dashboardService.getDashboardSummary(userId);
  const responseBody = dashboardSummaryResponseSchema.parse({ data: summary });

  res.status(200).json(responseBody);
}
