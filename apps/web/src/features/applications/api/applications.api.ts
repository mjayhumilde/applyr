import {
  apiErrorResponseSchema,
  applicationEventResponseSchema,
  applicationListResponseSchema,
  applicationResponseSchema,
  type Application,
  type ApplicationEvent,
  type CreateApplicationEventRequest,
  type CreateApplicationRequest,
  type UpdateApplicationRequest,
} from "@applyr/contracts";

import { ApiError } from "../../../shared/api/ApiError";

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

    throw new ApiError(
      errorResult.success
        ? errorResult.data.error.message
        : `Unable to load application (HTTP ${response.status})`,
      response.status,
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

export async function updateApplication(
  applicationId: number,
  input: UpdateApplicationRequest,
): Promise<Application> {
  const response = await fetch(`/api/applications/${applicationId}`, {
    method: "PUT",
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
        : `Unable to update application (HTTP ${response.status})`,
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

export async function deleteApplication(applicationId: number): Promise<void> {
  const response = await fetch(`/api/applications/${applicationId}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.ok) {
    return;
  }

  const responseBody: unknown = await response.json().catch(() => null);
  const errorResult = apiErrorResponseSchema.safeParse(responseBody);

  throw new Error(
    errorResult.success
      ? errorResult.data.error.message
      : `Unable to delete application (HTTP ${response.status})`,
  );
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
