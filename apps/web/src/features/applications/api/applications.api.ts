import {
  apiErrorResponseSchema,
  applicationListResponseSchema,
  applicationResponseSchema,
  type Application,
  type CreateApplicationRequest,
} from "@applyr/contracts";

export async function getApplications(
  signal?: AbortSignal,
): Promise<Application[]> {
  const response = await fetch("/api/applications", {
    headers: {
      Accept: "application/json",
    },
    signal,
  });
  const responseBody: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorResult = apiErrorResponseSchema.safeParse(responseBody);

    throw new Error(
      errorResult.success
        ? errorResult.data.error.message
        : `Unable to load applications (HTTP ${response.status})`,
    );
  }

  const applicationResult =
    applicationListResponseSchema.safeParse(responseBody);

  if (!applicationResult.success) {
    throw new Error(
      "The server returned application data in an unexpected format",
    );
  }

  return applicationResult.data.data;
}

export async function createApplication(
  input: CreateApplicationRequest,
): Promise<Application> {
  const response = await fetch("/api/applications", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const responseBody: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorResult = apiErrorResponseSchema.safeParse(responseBody);

    throw new Error(
      errorResult.success
        ? errorResult.data.error.message
        : `Unable to create application (HTTP ${response.status})`,
    );
  }

  const applicationResult = applicationResponseSchema.safeParse(responseBody);

  if (!applicationResult.success) {
    throw new Error(
      "The server returned application data in an unexpected format",
    );
  }

  return applicationResult.data.data;
}
