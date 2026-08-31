import {
  applicationIdParamsSchema,
  type Application,
  type UpdateApplicationRequest,
} from "@applyr/contracts";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { PageHeader } from "../../../shared/components/PageHeader";
import { StatePanel } from "../../../shared/components/StatePanel";
import { useDocumentTitle } from "../../../shared/hooks/useDocumentTitle";
import { getApplication, updateApplication } from "../api/applications.api";
import { ApplicationForm } from "../components/ApplicationForm";

type EditApplicationState =
  | { status: "loading" }
  | { status: "success"; applicationId: number; application: Application }
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
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const paramsResult = applicationIdParamsSchema.safeParse({ applicationId });
  const parsedApplicationId = paramsResult.success
    ? paramsResult.data.applicationId
    : null;
  const [state, setState] = useState<EditApplicationState>({
    status: "loading",
  });

  useDocumentTitle("Edit Application");

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

  async function saveApplication(
    input: UpdateApplicationRequest,
  ): Promise<void> {
    if (parsedApplicationId === null) {
      throw new Error("Invalid application ID");
    }

    await updateApplication(parsedApplicationId, input);
    navigate(`/applications/${parsedApplicationId}`, { replace: true });
  }

  return (
    <section className="mx-auto max-w-2xl">
      <PageHeader
        backLink={{
          label: "Back to application",
          to:
            parsedApplicationId === null
              ? "/applications"
              : `/applications/${parsedApplicationId}`,
        }}
        description="Update the company, role, and tracking details."
        title="Edit application"
      />

      {parsedApplicationId === null && (
        <div className="mt-6">
          <StatePanel
            message="The application address must contain a valid positive ID."
            title="Invalid application ID"
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
        state.status === "error" &&
        state.applicationId === parsedApplicationId && (
          <div className="mt-6">
            <StatePanel
              message={state.message}
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
            cancelTo={`/applications/${parsedApplicationId}`}
            initialValues={toApplicationFormValues(state.application)}
            onSubmit={saveApplication}
            submitLabel="Update application"
          />
        )}
    </section>
  );
};

export default EditApplicationPage;
