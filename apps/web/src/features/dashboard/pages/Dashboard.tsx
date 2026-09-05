import type { DashboardSummary } from "@applyr/contracts";
import { useEffect, useState } from "react";

import { PageHeader } from "../../../shared/components/PageHeader";
import { StatePanel } from "../../../shared/components/StatePanel";
import { useDocumentTitle } from "../../../shared/hooks/useDocumentTitle";
import { getDashboardSummary } from "../api/dashboard.api";
import { DashboardSummaryCards } from "../components/DashboardSummaryCards";

type DashboardState =
  | { status: "loading" }
  | { status: "success"; summary: DashboardSummary }
  | { status: "error"; message: string };

const Dashboard = () => {
  const [state, setState] = useState<DashboardState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

  useDocumentTitle("Overview");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard(): Promise<void> {
      try {
        const summary = await getDashboardSummary(controller.signal);

        if (!controller.signal.aborted) {
          setState({ status: "success", summary });
        }
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          message:
            "Select Retry to load the overview again. If the problem continues, try again later.",
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
    <section className="flex flex-col gap-6">
      <PageHeader
        description="A quick view of your job search progress."
        title="Overview"
      />

      {state.status === "loading" && (
        <StatePanel message="Loading overview…" variant="loading" />
      )}

      {state.status === "error" && (
        <StatePanel
          message={state.message}
          retry={{ onClick: retryLoadingDashboard }}
          title="Unable to load the overview"
          variant="error"
        />
      )}

      {state.status === "success" && (
        <DashboardSummaryCards summary={state.summary} />
      )}
    </section>
  );
};

export default Dashboard;
