import type { Application } from "@applyr/contracts";
import { useId } from "react";

import { StatusBadge } from "../../../shared/components/StatusBadge";
import { formatApplicationDate } from "../utils/formatApplicationDate";

interface ApplicationDetailsPanelProps {
  application: Application;
}

export function ApplicationDetailsPanel({
  application,
}: ApplicationDetailsPanelProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-panel border border-border bg-surface p-5 shadow-panel sm:p-6"
    >
      <header className="border-b border-border pb-5">
        <p className="font-data text-xs font-semibold text-muted">
          Application record
        </p>
        <h2
          className="mt-2 text-2xl leading-tight font-bold text-ink wrap-anywhere sm:text-3xl"
          id={headingId}
        >
          {application.role}
        </h2>

        {application.company.website ? (
          <a
            className="mt-2 inline-block max-w-full rounded-control font-semibold text-action wrap-anywhere hover:text-action-hover hover:underline"
            href={application.company.website}
            rel="noopener noreferrer"
            target="_blank"
          >
            {application.company.name}
            <span aria-hidden="true">{" \u2197"}</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <p className="mt-2 font-semibold text-muted wrap-anywhere">
            {application.company.name}
          </p>
        )}
      </header>

      <dl className="grid min-w-0 gap-x-6 gap-y-5 py-5 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="font-data text-xs font-semibold text-muted">Status</dt>
          <dd className="mt-2">
            <StatusBadge status={application.status} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-data text-xs font-semibold text-muted">
            Applied
          </dt>
          <dd className="mt-2 text-sm font-semibold text-ink">
            <time dateTime={application.dateApplied}>
              {formatApplicationDate(application.dateApplied)}
            </time>
          </dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className="font-data text-xs font-semibold text-muted">
            Job posting
          </dt>
          <dd className="mt-2 text-sm">
            {application.jobPostLink ? (
              <a
                className="rounded-control font-semibold text-action wrap-anywhere hover:text-action-hover hover:underline"
                href={application.jobPostLink}
                rel="noopener noreferrer"
                target="_blank"
              >
                {application.jobPostLink}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <span className="text-muted">No job posting link added.</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="border-t border-border pt-5">
        <h3 className="text-lg font-bold text-ink">Notes</h3>
        {application.notes?.trim() ? (
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-ink wrap-anywhere">
            {application.notes}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No notes yet. Edit this application to add context or reminders.
          </p>
        )}
      </div>
    </section>
  );
}
