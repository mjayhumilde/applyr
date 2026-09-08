import {
  dashboardSummarySchema,
  type DashboardSummary,
} from "@applyr/contracts";

import { withUserTransaction } from "../../db/with-user-transaction.js";

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
  FROM public.applications
  WHERE user_id = $1;
`;

export async function findDashboardSummary(
  userId: string,
): Promise<DashboardSummary> {
  return withUserTransaction(userId, async (client) => {
    const result = await client.query<RawDashboardSummaryRow>(
      findDashboardSummarySql,
      [userId],
    );

    return dashboardSummarySchema.parse(result.rows[0]);
  });
}
