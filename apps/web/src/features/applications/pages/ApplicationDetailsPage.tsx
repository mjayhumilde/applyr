import {
  applicationIdParamsSchema,
  type Application,
  type ApplicationEvent,
} from "@applyr/contracts";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";

import { PageHeader } from "../../../shared/components/PageHeader";
import { StatePanel } from "../../../shared/components/StatePanel";
import { useDocumentTitle } from "../../../shared/hooks/useDocumentTitle";
import { actionClassNames } from "../../../shared/styles/actionStyles";
import { getApplication } from "../api/applications.api";
import { ApplicationCard } from "../components/ApplicationCard";
import { ApplicationEventForm } from "../components/ApplicationEventForm";
import { DeleteApplicationButton } from "../components/DeleteApplicationButton";

type ApplicationDetailsState =
  | { status: "loading" }
  | { status: "success"; applicationId: number; application: Application }
  | { status: "error"; applicationId: number; message: string };

function getSaveSuccessMessage(locationState: unknown): string | null {
  if (
    typeof locationState !== "object" ||
    locationState === null ||
    !("saveResult" in locationState)
  ) {
    return null;
  }

  if (locationState.saveResult === "created") {
    return "Application created.";
  }

  if (locationState.saveResult === "updated") {
    return "Application updated.";
  }

  return null;
}

const ApplicationDetailsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const successMessage = getSaveSuccessMessage(location.state);
  const paramsResult = applicationIdParamsSchema.safeParse({ applicationId });
  const parsedApplicationId = paramsResult.success
    ? paramsResult.data.applicationId
    : null;
  const applicationsListUrl = `/applications${location.search}`;
  const [state, setState] = useState<ApplicationDetailsState>({
    status: "loading",
  });

  useDocumentTitle("Application Details");

  useEffect(() => {
    if (parsedApplicationId === null) {
      return;
    }

    const validApplicationId = parsedApplicationId;
    const controller = new AbortController();

    async function loadApplication(): Promise<void> {
      try {
        const application = await getApplication(
          validApplicationId,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setState({
            status: "success",
            applicationId: validApplicationId,
            application,
          });
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          applicationId: validApplicationId,
          message:
            error instanceof Error
              ? error.message
              : "Unable to load application",
        });
      }
    }

    void loadApplication();

    return () => {
      controller.abort();
    };
  }, [parsedApplicationId]);

  function addEventToTimeline(
    applicationId: number,
    event: ApplicationEvent,
  ): void {
    setState((currentState) => {
      if (
        currentState.status !== "success" ||
        currentState.applicationId !== applicationId
      ) {
        return currentState;
      }

      const events = [...currentState.application.events, event].sort(
        (left, right) => {
          const dateComparison = left.eventDate.localeCompare(right.eventDate);

          return dateComparison !== 0 ? dateComparison : left.id - right.id;
        },
      );

      return {
        ...currentState,
        application: {
          ...currentState.application,
          events,
        },
      };
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <PageHeader
        actions={
          parsedApplicationId !== null &&
          state.status === "success" &&
          state.applicationId === parsedApplicationId ? (
            <>
              <Link
                className={actionClassNames.primary}
                to={`/applications/${parsedApplicationId}/edit${location.search}`}
              >
                Edit application
              </Link>
              <DeleteApplicationButton
                applicationId={parsedApplicationId}
                onDeleted={() =>
                  navigate(applicationsListUrl, { replace: true })
                }
              />
            </>
          ) : undefined
        }
        backLink={{ label: "Back to applications", to: applicationsListUrl }}
        description="Review the application record and log important events."
        title="Application details"
      />

      {successMessage !== null && (
        <p
          className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success"
          role="status"
        >
          {successMessage}
        </p>
      )}

      {parsedApplicationId === null && (
        <StatePanel
          message="The application address must contain a valid positive ID."
          title="Invalid application ID"
          variant="error"
        />
      )}

      {parsedApplicationId !== null &&
        (state.status === "loading" ||
          state.applicationId !== parsedApplicationId) && (
          <StatePanel message="Loading application…" variant="loading" />
        )}

      {parsedApplicationId !== null &&
        state.status === "error" &&
        state.applicationId === parsedApplicationId && (
          <StatePanel
            message={state.message}
            title="Unable to load application"
            variant="error"
          />
        )}

      {parsedApplicationId !== null &&
        state.status === "success" &&
        state.applicationId === parsedApplicationId && (
          <>
            <ApplicationCard
              application={state.application}
              showDetailsLink={false}
            />
            <ApplicationEventForm
              key={parsedApplicationId}
              applicationId={parsedApplicationId}
              onCreated={addEventToTimeline}
            />
          </>
        )}
    </section>
  );
};

export default ApplicationDetailsPage;
