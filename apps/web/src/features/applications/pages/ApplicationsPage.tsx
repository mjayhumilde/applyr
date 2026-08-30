import type { Application, ApplicationStatus } from "@applyr/contracts";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { getApplications } from "../api/applications.api";
import { ApplicationCard } from "../components/ApplicationCard";
import { ApplicationFilters } from "../components/ApplicationFilters";

type ApplicationsState =
  | { status: "loading" }
  | { status: "success"; applications: Application[] }
  | { status: "error"; message: string };

const ApplicationsPage = () => {
  const [state, setState] = useState<ApplicationsState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);
  const [companyQuery, setCompanyQuery] = useState("");
  const [dateApplied, setDateApplied] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "">("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadApplications(): Promise<void> {
      try {
        const applications = await getApplications(controller.signal);

        if (!controller.signal.aborted) {
          setState({ status: "success", applications });
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load applications",
        });
      }
    }

    void loadApplications();

    return () => {
      controller.abort();
    };
  }, [requestVersion]);

  function retryLoadingApplications(): void {
    setState({ status: "loading" });
    setRequestVersion((currentVersion) => currentVersion + 1);
  }

  function clearFilters(): void {
    setCompanyQuery("");
    setDateApplied("");
    setStatus("");
  }

  const normalizedCompanyQuery = companyQuery.trim().toLowerCase();
  const filteredApplications =
    state.status === "success"
      ? state.applications.filter((application) => {
          const matchesCompany = application.company.name
            .toLowerCase()
            .includes(normalizedCompanyQuery);
          const matchesDate =
            dateApplied === "" || application.dateApplied === dateApplied;
          const matchesStatus = status === "" || application.status === status;

          return matchesCompany && matchesDate && matchesStatus;
        })
      : [];

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-4 p-6 sm:p-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Applications</h1>
        <Link
          to="/applications/new"
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Add application
        </Link>
      </header>

      {state.status === "loading" && (
        <p className="text-center text-gray-600" aria-live="polite">
          Loading applications...
        </p>
      )}

      {state.status === "error" && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-center"
          role="alert"
        >
          <p className="text-sm text-red-700">{state.message}</p>
          <button
            type="button"
            className="mt-3 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
            onClick={retryLoadingApplications}
          >
            Try again
          </button>
        </div>
      )}

      {state.status === "success" && state.applications.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            No applications yet
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Add your first job application to start tracking your search.
          </p>
        </div>
      )}

      {state.status === "success" && state.applications.length > 0 && (
        <ApplicationFilters
          companyQuery={companyQuery}
          dateApplied={dateApplied}
          onClear={clearFilters}
          onCompanyQueryChange={setCompanyQuery}
          onDateAppliedChange={setDateApplied}
          onStatusChange={setStatus}
          status={status}
        />
      )}

      {state.status === "success" &&
        state.applications.length > 0 &&
        filteredApplications.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-gray-600">
              No applications match these filters.
            </p>
            <button
              className="mt-3 text-sm font-medium text-blue-700 hover:underline"
              onClick={clearFilters}
              type="button"
            >
              Clear filters
            </button>
          </div>
        )}

      {state.status === "success" &&
        filteredApplications.map((application) => (
          <ApplicationCard key={application.id} application={application} />
        ))}
    </section>
  );
};

export default ApplicationsPage;
