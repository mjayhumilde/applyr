import type { ApplicationEvent } from "@applyr/contracts";
import { useId } from "react";

import { formatApplicationDate } from "../utils/formatApplicationDate";

interface ApplicationTimelineProps {
  events: ApplicationEvent[];
}

export function ApplicationTimeline({ events }: ApplicationTimelineProps) {
  const headingId = useId();
  const orderedEvents = [...events].sort(
    (left, right) =>
      left.eventDate.localeCompare(right.eventDate) || left.id - right.id,
  );

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-panel border border-border bg-surface p-5 shadow-panel sm:p-6"
    >
      <header className="border-b border-border pb-4">
        <h2 className="text-xl font-bold text-ink" id={headingId}>
          Application timeline
        </h2>
        <p className="mt-1 text-sm text-muted">
          Interviews, follow-ups, and milestones, from oldest to newest.
        </p>
      </header>

      {orderedEvents.length === 0 ? (
        <div className="py-6">
          <p className="font-semibold text-ink">No events logged yet</p>
          <p className="mt-1 text-sm text-muted">
            Log an interview, follow-up, or offer using the form below.
          </p>
        </div>
      ) : (
        <ol className="mt-5">
          {orderedEvents.map((event) => (
            <li
              className="relative grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-3 pb-6 before:absolute before:top-0 before:bottom-0 before:left-9 before:w-px before:bg-border last:pb-0 last:before:hidden sm:gap-5"
              key={event.id}
            >
              <time
                className="relative z-10 self-start rounded-control border border-border bg-canvas px-2 py-2 text-center font-data text-xs leading-5 font-semibold text-action-hover"
                dateTime={event.eventDate}
              >
                {formatApplicationDate(event.eventDate)}
              </time>
              <div className="flex min-h-14 min-w-0 items-center">
                <h3 className="text-base leading-snug font-semibold text-ink wrap-anywhere">
                  {event.eventType}
                </h3>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
