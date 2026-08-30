import {
  apiErrorResponseSchema,
  dashboardSummaryResponseSchema,
  type DashboardSummary,
} from "@applyr/contracts";

export async function getDashboardSummary(
  signal?: AbortSignal,
): Promise<DashboardSummary> {
  const response = await fetch("/api/dashboard", {
    headers: {
      Accept: "application/json",
    },
    signal,
  });
  const responseBody: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorResult = apiErrorResponseSchema.safeParse(responseBody);

    throw new Error(
      errorResult.success
        ? errorResult.data.error.message
        : `Unable to load dashboard (HTTP ${response.status})`,
    );
  }

  const summaryResult = dashboardSummaryResponseSchema.safeParse(responseBody);

  if (!summaryResult.success) {
    throw new Error(
      "The server returned dashboard data in an unexpected format",
    );
  }

  return summaryResult.data.data;
}
