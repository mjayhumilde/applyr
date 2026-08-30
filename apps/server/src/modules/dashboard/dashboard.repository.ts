import {
  dashboardSummarySchema,
  type DashboardSummary,
} from "@applyr/contracts";

import { pool } from "../../db/pool.js";

type RawDashboardSummaryRow = Record<string, unknown>;

const findDashboardSummarySql = `
  SELECT
    COUNT(*)::integer AS "totalApplications",
    jsonb_build_object(
      'Applied', (COUNT(*) FILTER (WHERE status = 'Applied'))::integer,
      'Interview', (COUNT(*) FILTER (WHERE status = 'Interview'))::integer,
      'Offer', (COUNT(*) FILTER (WHERE status = 'Offer'))::integer,
      'Rejected', (COUNT(*) FILTER (WHERE status = 'Rejected'))::integer
    ) AS "byStatus"
  FROM public.applications;
`;

export async function findDashboardSummary(): Promise<DashboardSummary> {
  const result = await pool.query<RawDashboardSummaryRow>(
    findDashboardSummarySql,
  );

  return dashboardSummarySchema.parse(result.rows[0]);
}
