import type { DashboardSummary } from "@applyr/contracts";

import { findDashboardSummary } from "./dashboard.repository.js";

export async function getDashboardSummary(
  userId: string,
): Promise<DashboardSummary> {
  return findDashboardSummary(userId);
}
