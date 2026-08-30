import type { Application, ApplicationStatus } from "@applyr/contracts";
import { Link } from "react-router";

interface ApplicationCardProps {
  application: Application;
  showDetailsLink?: boolean;
}

const statusColors = {
  Applied: "bg-blue-100 text-blue-700",
  Interview: "bg-yellow-100 text-yellow-700",
  Offer: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
} satisfies Record<ApplicationStatus, string>;

export function ApplicationCard({
  application,
  showDetailsLink = true,
}: ApplicationCardProps) {
  return (
    <article className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{application.role}</h2>
          {application.company.website ? (
            <a
              href={application.company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:underline"
            >
              {application.company.name}
            </a>
          ) : (
            <p className="text-sm text-gray-500">{application.company.name}</p>
          )}
        </div>

        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[application.status]}`}
        >
          {application.status}
        </span>
      </div>

      <div className="mt-2 text-sm text-gray-600">
        <p>
          Applied on:{" "}
          <time dateTime={application.dateApplied}>
            {application.dateApplied}
          </time>
        </p>
        {application.jobPostLink && (
          <a
            href={application.jobPostLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View job post
          </a>
        )}
      </div>

      {application.notes && (
        <p className="mt-2 text-sm italic text-gray-500">{application.notes}</p>
      )}

      {application.events.length > 0 && (
        <div className="mt-3 border-t pt-2">
          <p className="mb-1 text-xs font-semibold text-gray-500">Timeline</p>
          <ul className="space-y-1 text-sm text-gray-700">
            {application.events.map((event) => (
              <li key={event.id} className="flex justify-between gap-4">
                <span>{event.eventType}</span>
                <time dateTime={event.eventDate} className="text-gray-400">
                  {event.eventDate}
                </time>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showDetailsLink && (
        <Link
          to={`/applications/${application.id}`}
          className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline"
        >
          View details
        </Link>
      )}
    </article>
  );
}
