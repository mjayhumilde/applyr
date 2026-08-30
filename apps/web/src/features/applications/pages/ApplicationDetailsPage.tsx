import {
  applicationIdParamsSchema,
  type Application,
  type ApplicationEvent,
} from "@applyr/contracts";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { getApplication } from "../api/applications.api";
import { ApplicationCard } from "../components/ApplicationCard";
import { ApplicationEventForm } from "../components/ApplicationEventForm";
import { DeleteApplicationButton } from "../components/DeleteApplicationButton";

type ApplicationDetailsState =
  | { status: "loading" }
  | { status: "success"; applicationId: number; application: Application }
  | { status: "error"; applicationId: number; message: string };

const ApplicationDetailsPage = () => {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const paramsResult = applicationIdParamsSchema.safeParse({ applicationId });
  const parsedApplicationId = paramsResult.success
    ? paramsResult.data.applicationId
    : null;
  const [state, setState] = useState<ApplicationDetailsState>({
    status: "loading",
  });

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
    <section className="mx-auto flex max-w-4xl flex-col gap-4 p-6 sm:p-10">
      <Link
        to="/applications"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        Back to applications
      </Link>

      <h1 className="text-3xl font-bold text-gray-900">Application details</h1>

      {parsedApplicationId === null && (
        <p className="rounded-md bg-red-50 p-4 text-red-700" role="alert">
          Invalid application ID
        </p>
      )}

      {parsedApplicationId !== null &&
        (state.status === "loading" ||
          state.applicationId !== parsedApplicationId) && (
          <p className="text-gray-600" aria-live="polite">
            Loading application...
          </p>
        )}

      {parsedApplicationId !== null &&
        state.status === "error" &&
        state.applicationId === parsedApplicationId && (
          <p className="rounded-md bg-red-50 p-4 text-red-700" role="alert">
            {state.message}
          </p>
        )}

      {parsedApplicationId !== null &&
        state.status === "success" &&
        state.applicationId === parsedApplicationId && (
          <>
            <div className="flex flex-wrap items-start gap-3">
              <Link
                to={`/applications/${parsedApplicationId}/edit`}
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Edit application
              </Link>
              <DeleteApplicationButton
                applicationId={parsedApplicationId}
                onDeleted={() => navigate("/applications", { replace: true })}
              />
            </div>
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
