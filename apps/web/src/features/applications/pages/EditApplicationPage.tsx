import {
  applicationIdParamsSchema,
  type Application,
  type UpdateApplicationRequest,
} from "@applyr/contracts";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";

import { ApiError } from "../../../shared/api/ApiError";
import { PageHeader } from "../../../shared/components/PageHeader";
import { StatePanel } from "../../../shared/components/StatePanel";
import { useDocumentTitle } from "../../../shared/hooks/useDocumentTitle";
import { actionClassNames } from "../../../shared/styles/actionStyles";
import { getApplication, updateApplication } from "../api/applications.api";
import { ApplicationForm } from "../components/ApplicationForm";

type EditApplicationState =
  | { status: "loading" }
  | { status: "success"; applicationId: number; application: Application }
  | { status: "not-found"; applicationId: number }
  | { status: "error"; applicationId: number; message: string };

function toApplicationFormValues(
  application: Application,
): UpdateApplicationRequest {
  return {
    company: {
      name: application.company.name,
      website: application.company.website,
    },
    role: application.role,
    jobPostLink: application.jobPostLink,
    status: application.status,
    dateApplied: application.dateApplied,
    notes: application.notes,
  };
}

const EditApplicationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const paramsResult = applicationIdParamsSchema.safeParse({ applicationId });
  const parsedApplicationId = paramsResult.success
    ? paramsResult.data.applicationId
    : null;
  const [state, setState] = useState<EditApplicationState>({
    status: "loading",
  });
  const [requestVersion, setRequestVersion] = useState(0);

  useDocumentTitle("Edit application");

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

        if (error instanceof ApiError && error.status === 404) {
          setState({ status: "not-found", applicationId: validApplicationId });
          return;
        }

        setState({
          status: "error",
          applicationId: validApplicationId,
          message:
            "Select Retry to load this application again. If the problem continues, try again later.",
        });
      }
    }

    void loadApplication();

    return () => {
      controller.abort();
    };
  }, [parsedApplicationId, requestVersion]);

  function retryLoadingApplication(): void {
    setState({ status: "loading" });
    setRequestVersion((currentVersion) => currentVersion + 1);
  }

  async function saveApplication(
    input: UpdateApplicationRequest,
  ): Promise<void> {
    if (parsedApplicationId === null) {
      throw new Error(
        "This application link is invalid. Return to your applications and choose a record to edit.",
      );
    }

    await updateApplication(parsedApplicationId, input);
    navigate(`/applications/${parsedApplicationId}${location.search}`, {
      replace: true,
      state: { saveResult: "updated" },
    });
  }

  return (
    <section className="mx-auto max-w-2xl">
      <PageHeader
        backLink={{
          label:
            parsedApplicationId === null
              ? "Back to applications"
              : "Back to application",
          to:
            parsedApplicationId === null
              ? `/applications${location.search}`
              : `/applications/${parsedApplicationId}${location.search}`,
        }}
        description="Update the company, role, and tracking details."
        title="Edit application"
      />

      {parsedApplicationId === null && (
        <div className="mt-6">
          <StatePanel
            message="This application link is invalid. Use Back to applications to choose a record from your list."
            title="Invalid application link"
            variant="error"
          />
        </div>
      )}

      {parsedApplicationId !== null &&
        (state.status === "loading" ||
          state.applicationId !== parsedApplicationId) && (
          <div className="mt-6">
            <StatePanel message="Loading application…" variant="loading" />
          </div>
        )}

      {parsedApplicationId !== null &&
        state.status === "not-found" &&
        state.applicationId === parsedApplicationId && (
          <div className="mt-6">
            <StatePanel
              action={
                <Link
                  className={actionClassNames.secondary}
                  to={`/applications${location.search}`}
                >
                  Back to applications
                </Link>
              }
              message="This application may have been deleted, or the link is incorrect. Return to your applications to choose another record."
              title="Application not found"
              variant="empty"
            />
          </div>
        )}

      {parsedApplicationId !== null &&
        state.status === "error" &&
        state.applicationId === parsedApplicationId && (
          <div className="mt-6">
            <StatePanel
              message={state.message}
              retry={{ onClick: retryLoadingApplication }}
              title="Unable to load application"
              variant="error"
            />
          </div>
        )}

      {parsedApplicationId !== null &&
        state.status === "success" &&
        state.applicationId === parsedApplicationId && (
          <ApplicationForm
            key={state.application.id}
            cancelTo={`/applications/${parsedApplicationId}${location.search}`}
            initialValues={toApplicationFormValues(state.application)}
            onSubmit={saveApplication}
            submitLabel="Update application"
          />
        )}
    </section>
  );
};

export default EditApplicationPage;
