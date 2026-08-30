import type { DashboardSummary } from "@applyr/contracts";
import { useEffect, useState } from "react";

import { getDashboardSummary } from "../api/dashboard.api";
import { DashboardHeader } from "../components/DashboardHeader";
import { DashboardSummaryCards } from "../components/DashboardSummaryCards";

type DashboardState =
  | { status: "loading" }
  | { status: "success"; summary: DashboardSummary }
  | { status: "error"; message: string };

const Dashboard = () => {
  const [state, setState] = useState<DashboardState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard(): Promise<void> {
      try {
        const summary = await getDashboardSummary(controller.signal);

        if (!controller.signal.aborted) {
          setState({ status: "success", summary });
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          message:
            error instanceof Error ? error.message : "Unable to load dashboard",
        });
      }
    }

    void loadDashboard();

    return () => {
      controller.abort();
    };
  }, [requestVersion]);

  function retryLoadingDashboard(): void {
    setState({ status: "loading" });
    setRequestVersion((currentVersion) => currentVersion + 1);
  }

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 p-6 sm:p-10">
      <DashboardHeader />

      {state.status === "loading" && (
        <p className="text-center text-gray-600" aria-live="polite">
          Loading dashboard...
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
            onClick={retryLoadingDashboard}
          >
            Try again
          </button>
        </div>
      )}

      {state.status === "success" && (
        <DashboardSummaryCards summary={state.summary} />
      )}
    </section>
  );
};

export default Dashboard;
