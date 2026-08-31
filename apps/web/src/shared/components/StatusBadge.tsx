import type { ApplicationStatus } from "@applyr/contracts";

interface StatusBadgeProps {
  status: ApplicationStatus;
}

const statusClassNames = {
  Applied: "border-action/25 bg-action/10 text-action-hover",
  Interview: "border-interview/25 bg-interview/10 text-interview",
  Offer: "border-offer/25 bg-offer/10 text-offer",
  Rejected: "border-danger/25 bg-danger/10 text-danger",
} satisfies Record<ApplicationStatus, string>;

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 font-data text-xs font-semibold ${statusClassNames[status]}`}
    >
      {status}
    </span>
  );
}
