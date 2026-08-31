import type { Application, ApplicationStatus } from "@applyr/contracts";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { PageHeader } from "../../../shared/components/PageHeader";
import { StatePanel } from "../../../shared/components/StatePanel";
import { useDocumentTitle } from "../../../shared/hooks/useDocumentTitle";
import { actionClassNames } from "../../../shared/styles/actionStyles";
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

  useDocumentTitle("Applications");

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
    <section className="flex flex-col gap-4">
      <PageHeader
        description="Review every role, status, and next step in one place."
        title="Applications"
      />

      {state.status === "loading" && (
        <StatePanel message="Loading applications…" variant="loading" />
      )}

      {state.status === "error" && (
        <StatePanel
          message={state.message}
          retry={{ onClick: retryLoadingApplications }}
          title="Unable to load applications"
          variant="error"
        />
      )}

      {state.status === "success" && state.applications.length === 0 && (
        <StatePanel
          action={
            <Link className={actionClassNames.primary} to="/applications/new">
              Add your first application
            </Link>
          }
          message="Add your first job application to start tracking your search."
          title="No applications yet"
          variant="empty"
        />
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
          <StatePanel
            action={
              <button
                className={actionClassNames.secondary}
                onClick={clearFilters}
                type="button"
              >
                Clear filters
              </button>
            }
            message="Clear or adjust the current filters to see more records."
            title="No matching applications"
            variant="empty"
          />
        )}

      {state.status === "success" &&
        filteredApplications.map((application) => (
          <ApplicationCard key={application.id} application={application} />
        ))}
    </section>
  );
};

export default ApplicationsPage;
