import {
  applicationIdParamsSchema,
  type Application,
  type UpdateApplicationRequest,
} from "@applyr/contracts";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

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
      <Link
        to={
          parsedApplicationId === null
            ? "/applications"
            : `/applications/${parsedApplicationId}`
        }
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        Back to application
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-gray-900">
        Edit application
      </h1>

      {parsedApplicationId === null && (
        <p className="mt-6 rounded-md bg-red-50 p-4 text-red-700" role="alert">
          Invalid application ID
        </p>
      )}

      {parsedApplicationId !== null &&
        (state.status === "loading" ||
          state.applicationId !== parsedApplicationId) && (
          <p className="mt-6 text-gray-600" aria-live="polite">
            Loading application...
          </p>
        )}

      {parsedApplicationId !== null &&
        state.status === "error" &&
        state.applicationId === parsedApplicationId && (
          <p
            className="mt-6 rounded-md bg-red-50 p-4 text-red-700"
            role="alert"
          >
            {state.message}
          </p>
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
