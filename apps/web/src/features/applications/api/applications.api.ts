import {
  apiErrorResponseSchema,
  applicationEventResponseSchema,
  applicationListResponseSchema,
  applicationResponseSchema,
  type Application,
  type ApplicationEvent,
  type CreateApplicationEventRequest,
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

export async function getApplication(
  applicationId: number,
  signal?: AbortSignal,
): Promise<Application> {
  const response = await fetch(`/api/applications/${applicationId}`, {
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
        : `Unable to load application (HTTP ${response.status})`,
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

export async function createApplicationEvent(
  applicationId: number,
  input: CreateApplicationEventRequest,
): Promise<ApplicationEvent> {
  const response = await fetch(`/api/applications/${applicationId}/events`, {
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
        : `Unable to create event (HTTP ${response.status})`,
    );
  }

  const eventResult = applicationEventResponseSchema.safeParse(responseBody);

  if (!eventResult.success) {
    throw new Error("The server returned event data in an unexpected format");
  }

  return eventResult.data.data;
}
