import type { DashboardSummary } from "@applyr/contracts";

import { findDashboardSummary } from "./dashboard.repository.js";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return findDashboardSummary();
}
