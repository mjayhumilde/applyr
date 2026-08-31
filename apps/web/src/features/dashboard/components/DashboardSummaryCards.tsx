import {
  applicationStatusSchema,
  type DashboardSummary,
} from "@applyr/contracts";

import { StatusBadge } from "../../../shared/components/StatusBadge";

interface DashboardSummaryCardsProps {
  summary: DashboardSummary;
}

export function DashboardSummaryCards({ summary }: DashboardSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-panel border border-border bg-surface p-5 shadow-panel">
        <p className="text-sm font-medium text-muted">Total applications</p>
        <p className="mt-2 font-data text-3xl font-bold text-ink tabular-nums">
          {summary.totalApplications}
        </p>
      </div>

      {applicationStatusSchema.options.map((applicationStatus) => (
        <div
          key={applicationStatus}
          className="rounded-panel border border-border bg-surface p-5 shadow-panel"
        >
          <StatusBadge status={applicationStatus} />
          <p className="mt-2 font-data text-3xl font-bold text-ink tabular-nums">
            {summary.byStatus[applicationStatus]}
          </p>
        </div>
      ))}
    </div>
  );
}
