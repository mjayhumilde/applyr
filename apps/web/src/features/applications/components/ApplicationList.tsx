import type { Application } from "@applyr/contracts";

import {
  ApplicationListItem,
  applicationLedgerColumnsClassName,
} from "./ApplicationListItem";

interface ApplicationListProps {
  applications: Application[];
  returnSearch: string;
}

export function ApplicationList({
  applications,
  returnSearch,
}: ApplicationListProps) {
  return (
    <section aria-label="Application results">
      <div className="md:overflow-hidden md:rounded-panel md:border md:border-border md:bg-surface md:shadow-panel">
        <div
          aria-hidden="true"
          className={`hidden gap-4 border-b border-border bg-canvas/70 px-4 py-2 font-data text-xs font-semibold tracking-[0.1em] text-muted uppercase md:grid ${applicationLedgerColumnsClassName}`}
        >
          <span>Position</span>
          <span>Status</span>
          <span>Activity</span>
          <span>Applied</span>
          <span>Record</span>
        </div>

        <ul className="grid gap-3 md:block md:divide-y md:divide-border">
          {applications.map((application) => (
            <ApplicationListItem
              application={application}
              key={application.id}
              returnSearch={returnSearch}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
