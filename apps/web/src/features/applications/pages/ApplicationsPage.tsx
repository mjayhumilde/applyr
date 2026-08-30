import type { Application } from "@applyr/contracts";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { getApplications } from "../api/applications.api";
import { ApplicationCard } from "../components/ApplicationCard";

type ApplicationsState =
  | { status: "loading" }
  | { status: "success"; applications: Application[] }
  | { status: "error"; message: string };

const ApplicationsPage = () => {
  const [state, setState] = useState<ApplicationsState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

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

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-4 p-6 sm:p-10">
      <header>
        <h1 className="text-center text-3xl font-bold">Applications</h1>
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
          <Link
            to="/applications/new"
            className="mt-4 inline-block rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Add application
          </Link>
        </div>
      )}

      {state.status === "success" &&
        state.applications.map((application) => (
          <ApplicationCard key={application.id} application={application} />
        ))}
    </section>
  );
};

export default ApplicationsPage;
