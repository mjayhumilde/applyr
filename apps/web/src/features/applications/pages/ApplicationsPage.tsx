import { dummyApplications } from "../data/applications";
import type { ApplicationStatus } from "../types/application";

const statusColors = {
  Applied: "bg-blue-100 text-blue-700",
  Interview: "bg-yellow-100 text-yellow-700",
  Offer: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
} satisfies Record<ApplicationStatus, string>;

const ApplicationsPage = () => {
  return (
    <div className="flex flex-col gap-4 p-40">
      <div>
        <h1 className="text-center text-3xl font-bold">APPLICATION PAGE</h1>
      </div>
      {dummyApplications.map((application) => (
        <div
          key={application.id}
          className="border rounded-lg p-4 shadow-sm bg-white"
        >
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">{application.role}</h2>
              <a
                href={application.company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:underline"
              >
                {application.company.name}
              </a>
            </div>

            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                statusColors[application.status] ?? "bg-gray-100 text-gray-700"
              }`}
            >
              {application.status}
            </span>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            <p>Applied on: {application.dateApplied}</p>
            <a
              href={application.jobPostLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View job post
            </a>
          </div>

          {application.notes && (
            <p className="mt-2 text-sm italic text-gray-500">
              {application.notes}
            </p>
          )}

          {application.events.length > 0 && (
            <div className="mt-3 border-t pt-2">
              <p className="text-xs font-semibold text-gray-500 mb-1">
                Timeline
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                {application.events.map((event) => (
                  <li key={event.id} className="flex justify-between">
                    <span>{event.eventType}</span>
                    <span className="text-gray-400">{event.eventDate}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ApplicationsPage;
