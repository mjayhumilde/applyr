import {
  applicationStatusSchema,
  type ApplicationStatus,
  type DashboardSummary,
} from "@applyr/contracts";

interface DashboardSummaryCardsProps {
  summary: DashboardSummary;
}

const statusCardStyles = {
  Applied: "border-blue-200 bg-blue-50 text-blue-800",
  Interview: "border-yellow-200 bg-yellow-50 text-yellow-800",
  Offer: "border-green-200 bg-green-50 text-green-800",
  Rejected: "border-red-200 bg-red-50 text-red-800",
} satisfies Record<ApplicationStatus, string>;

export function DashboardSummaryCards({ summary }: DashboardSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-gray-600">Total applications</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {summary.totalApplications}
        </p>
      </article>

      {applicationStatusSchema.options.map((applicationStatus) => (
        <article
          key={applicationStatus}
          className={`rounded-lg border p-5 ${statusCardStyles[applicationStatus]}`}
        >
          <p className="text-sm font-medium">{applicationStatus}</p>
          <p className="mt-2 text-3xl font-bold">
            {summary.byStatus[applicationStatus]}
          </p>
        </article>
      ))}
    </div>
  );
}
