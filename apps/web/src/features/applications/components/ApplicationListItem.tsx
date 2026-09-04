import type { Application, ApplicationEvent } from "@applyr/contracts";
import { Link } from "react-router";

import { StatusBadge } from "../../../shared/components/StatusBadge";

interface ApplicationListItemProps {
  application: Application;
  returnSearch: string;
}

interface RelevantEvent {
  event: ApplicationEvent;
  label: "Latest event" | "Next event";
}

export const applicationLedgerColumnsClassName =
  "md:grid-cols-[minmax(0,2fr)_minmax(6.5rem,0.75fr)_minmax(0,1.25fr)_minmax(7.5rem,0.8fr)_auto]";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function getTodayIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRelevantEvent(events: ApplicationEvent[]): RelevantEvent | null {
  const orderedEvents = [...events].sort(
    (left, right) =>
      left.eventDate.localeCompare(right.eventDate) || left.id - right.id,
  );
  const today = getTodayIsoDate();
  const nextEvent = orderedEvents.find((event) => event.eventDate >= today);

  if (nextEvent !== undefined) {
    return { event: nextEvent, label: "Next event" };
  }

  const latestEvent = orderedEvents.at(-1);

  return latestEvent === undefined
    ? null
    : { event: latestEvent, label: "Latest event" };
}

export function ApplicationListItem({
  application,
  returnSearch,
}: ApplicationListItemProps) {
  const relevantEvent = getRelevantEvent(application.events);
  const detailsTo = {
    pathname: `/applications/${application.id}`,
    search: returnSearch,
  };

  return (
    <li>
      <article
        className={`grid min-w-0 gap-4 rounded-panel border border-border bg-surface p-4 shadow-panel md:items-center md:rounded-none md:border-0 md:bg-transparent md:shadow-none ${applicationLedgerColumnsClassName}`}
      >
        <div className="min-w-0">
          <h2 className="break-words text-lg font-bold text-ink">
            {application.role}
          </h2>

          {application.company.website ? (
            <a
              className="mt-0.5 block break-words text-sm font-semibold text-action hover:text-action-hover hover:underline"
              href={application.company.website}
              rel="noopener noreferrer"
              target="_blank"
            >
              {application.company.name}
            </a>
          ) : (
            <p className="mt-0.5 break-words text-sm font-semibold text-muted">
              {application.company.name}
            </p>
          )}

          {application.notes && (
            <p className="mt-2 line-clamp-2 break-words text-sm text-muted">
              {application.notes}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <p className="mb-1 font-data text-xs font-semibold tracking-[0.08em] text-muted uppercase md:sr-only">
            Status
          </p>
          <StatusBadge status={application.status} />
        </div>

        <div className="min-w-0">
          {relevantEvent === null ? (
            <>
              <p className="font-data text-xs font-semibold tracking-[0.08em] text-muted uppercase md:sr-only">
                Activity
              </p>
              <p className="mt-1 text-sm text-muted md:mt-0">
                No events logged
              </p>
            </>
          ) : (
            <>
              <p className="font-data text-xs font-semibold tracking-[0.08em] text-muted uppercase">
                {relevantEvent.label}
              </p>
              <p className="mt-1 line-clamp-2 break-words text-sm font-semibold text-ink">
                {relevantEvent.event.eventType}
              </p>
              <time
                className="mt-0.5 block text-xs text-muted"
                dateTime={relevantEvent.event.eventDate}
              >
                {formatDate(relevantEvent.event.eventDate)}
              </time>
            </>
          )}
        </div>

        <div className="min-w-0">
          <p className="font-data text-xs font-semibold tracking-[0.08em] text-muted uppercase md:sr-only">
            Applied
          </p>
          <time
            className="mt-1 block text-sm font-semibold text-ink md:mt-0"
            dateTime={application.dateApplied}
          >
            {formatDate(application.dateApplied)}
          </time>

          {application.jobPostLink && (
            <a
              className="mt-1 inline-flex min-h-8 items-center rounded-control text-xs font-bold text-action hover:text-action-hover hover:underline"
              href={application.jobPostLink}
              rel="noopener noreferrer"
              target="_blank"
            >
              Job post <span aria-hidden="true">{"\u2197"}</span>
            </a>
          )}
        </div>

        <div className="flex border-t border-border pt-3 md:justify-end md:border-0 md:pt-0">
          <Link
            aria-label={`View ${application.role} at ${application.company.name}`}
            className="inline-flex min-h-11 items-center rounded-control text-sm font-bold text-action hover:text-action-hover hover:underline"
            to={detailsTo}
          >
            View <span aria-hidden="true">{"\u2192"}</span>
          </Link>
        </div>
      </article>
    </li>
  );
}
