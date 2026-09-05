import {
  type Application,
  type ApplicationStatus,
} from "@applyr/contracts";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";

import { PageHeader } from "../../../shared/components/PageHeader";
import { StatePanel } from "../../../shared/components/StatePanel";
import { useDocumentTitle } from "../../../shared/hooks/useDocumentTitle";
import { actionClassNames } from "../../../shared/styles/actionStyles";
import { getApplications } from "../api/applications.api";
import { ApplicationFilters } from "../components/ApplicationFilters";
import { ApplicationList } from "../components/ApplicationList";
import {
  applicationListSearchParamsSchema,
  type ApplicationListSearchParams,
  type ApplicationListSort,
} from "../schemas/applicationListSearchParams";

type ApplicationsState =
  | { status: "loading" }
  | { status: "success"; applications: Application[] }
  | { status: "error"; message: string };

const applicationStatusOrder = {
  Applied: 0,
  Interview: 1,
  Offer: 2,
  Rejected: 3,
} satisfies Record<ApplicationStatus, number>;

function sortApplications(
  applications: Application[],
  sort: ApplicationListSort,
): Application[] {
  return [...applications].sort((left, right) => {
    if (sort === "oldest") {
      return (
        left.dateApplied.localeCompare(right.dateApplied) || left.id - right.id
      );
    }

    if (sort === "status") {
      return (
        applicationStatusOrder[left.status] -
          applicationStatusOrder[right.status] ||
        right.dateApplied.localeCompare(left.dateApplied) ||
        right.id - left.id
      );
    }

    return (
      right.dateApplied.localeCompare(left.dateApplied) || right.id - left.id
    );
  });
}

function getCanonicalSearch(
  searchParams: URLSearchParams,
  values: ApplicationListSearchParams,
): string | null {
  const nextSearchParams = new URLSearchParams(searchParams);
  const knownSearchParams = [
    ["company", values.company],
    ["date", values.date],
    ["sort", values.sort],
    ["status", values.status],
  ] as const satisfies ReadonlyArray<
    readonly [keyof ApplicationListSearchParams, string]
  >;
  let didChange = false;

  for (const [name, value] of knownSearchParams) {
    const currentValues = searchParams.getAll(name);
    const shouldBeOmitted =
      value === "" || (name === "sort" && value === "newest");

    if (shouldBeOmitted) {
      if (currentValues.length > 0) {
        nextSearchParams.delete(name);
        didChange = true;
      }

      continue;
    }

    if (currentValues.length !== 1 || currentValues[0] !== value) {
      nextSearchParams.set(name, value);
      didChange = true;
    }
  }

  return didChange ? nextSearchParams.toString() : null;
}

const ApplicationsPage = () => {
  const [state, setState] = useState<ApplicationsState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const listSearchParams = applicationListSearchParamsSchema.parse({
    company: searchParams.get("company") ?? "",
    date: searchParams.get("date") ?? "",
    sort: searchParams.get("sort") ?? "newest",
    status: searchParams.get("status") ?? "",
  });
  const {
    company: companyQuery,
    date: dateApplied,
    sort,
    status,
  } = listSearchParams;
  const canonicalSearch = getCanonicalSearch(searchParams, listSearchParams);

  useDocumentTitle("Applications");

  useEffect(() => {
    if (canonicalSearch !== null) {
      setSearchParams(canonicalSearch, { replace: true });
    }
  }, [canonicalSearch, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadApplications(): Promise<void> {
      try {
        const applications = await getApplications(controller.signal);

        if (!controller.signal.aborted) {
          setState({ status: "success", applications });
        }
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          message:
            "Select Retry to load your applications again. If the problem continues, try again later.",
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
    setSearchParams(
      (currentSearchParams) => {
        const nextSearchParams = new URLSearchParams(currentSearchParams);

        nextSearchParams.delete("company");
        nextSearchParams.delete("date");
        nextSearchParams.delete("status");

        return nextSearchParams;
      },
      { replace: true },
    );
  }

  function updateSearchParam(
    name: keyof ApplicationListSearchParams,
    value: string,
  ): void {
    setSearchParams(
      (currentSearchParams) => {
        const nextSearchParams = new URLSearchParams(currentSearchParams);

        if (value === "" || (name === "sort" && value === "newest")) {
          nextSearchParams.delete(name);
        } else {
          nextSearchParams.set(name, value);
        }

        return nextSearchParams;
      },
      { replace: true },
    );
  }

  const normalizedCompanyQuery = companyQuery.trim().toLowerCase();
  const visibleApplications =
    state.status === "success"
      ? sortApplications(
          state.applications.filter((application) => {
            const matchesCompany = application.company.name
              .toLowerCase()
              .includes(normalizedCompanyQuery);
            const matchesDate =
              dateApplied === "" || application.dateApplied === dateApplied;
            const matchesStatus =
              status === "" || application.status === status;

            return matchesCompany && matchesDate && matchesStatus;
          }),
          sort,
        )
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
          onCompanyQueryChange={(value) =>
            updateSearchParam("company", value)
          }
          onDateAppliedChange={(value) => updateSearchParam("date", value)}
          onSortChange={(value) => updateSearchParam("sort", value)}
          onStatusChange={(value) => updateSearchParam("status", value)}
          resultCount={visibleApplications.length}
          sort={sort}
          status={status}
        />
      )}

      {state.status === "success" &&
        state.applications.length > 0 &&
        visibleApplications.length === 0 && (
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
        visibleApplications.length > 0 && (
          <ApplicationList
            applications={visibleApplications}
            returnSearch={location.search}
          />
        )}
    </section>
  );
};

export default ApplicationsPage;
