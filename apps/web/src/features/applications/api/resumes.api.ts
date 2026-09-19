import {
  apiErrorResponseSchema,
  RESUME_MAX_BYTES,
  RESUME_MEDIA_TYPES,
  resumeFileNameSchema,
  resumeMediaTypeSchema,
  resumeResponseSchema,
  type Resume,
  type ResumeMediaType,
} from "@applyr/contracts";
import { z } from "zod";

import { ApiError } from "../../../shared/api/ApiError";

const selectedResumeSchema = z.object({
  name: resumeFileNameSchema,
  size: z
    .number()
    .int()
    .positive("Choose a file that is not empty")
    .max(RESUME_MAX_BYTES, "Choose a resume smaller than or equal to 4 MiB"),
});

export function validateResumeFile(file: File): ResumeMediaType {
  const result = selectedResumeSchema.safeParse({
    name: file.name,
    size: file.size,
  });

  if (!result.success) {
    throw new Error(
      result.error.issues[0]?.message ?? "Choose a PDF or DOCX file",
    );
  }

  // Browsers may leave File.type empty; the server checks the actual file bytes.
  return result.data.name.toLowerCase().endsWith(".pdf")
    ? RESUME_MEDIA_TYPES[0]
    : RESUME_MEDIA_TYPES[1];
}

async function throwResponseError(
  response: Response,
  fallback: string,
): Promise<never> {
  const body: unknown = await response.json().catch(() => null);
  const result = apiErrorResponseSchema.safeParse(body);

  throw new ApiError(
    result.success
      ? result.data.error.message
      : `${fallback} (HTTP ${response.status})`,
    response.status,
  );
}

async function readResumeResponse(
  response: Response,
  applicationId: number,
): Promise<Resume | null> {
  if (!response.ok) {
    await throwResponseError(response, "Unable to load the resume");
  }

  const body: unknown = await response.json().catch(() => null);
  const result = resumeResponseSchema.safeParse(body);

  if (
    !result.success ||
    (result.data.data !== null &&
      result.data.data.applicationId !== applicationId)
  ) {
    throw new Error("The server returned resume data in an unexpected format");
  }

  return result.data.data;
}

export async function getResume(
  applicationId: number,
  signal?: AbortSignal,
): Promise<Resume | null> {
  const response = await fetch(`/api/applications/${applicationId}/resume`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });

  return readResumeResponse(response, applicationId);
}

export async function uploadResume(
  applicationId: number,
  file: File,
  signal?: AbortSignal,
): Promise<Resume> {
  const mediaType = validateResumeFile(file);
  const response = await fetch(`/api/applications/${applicationId}/resume`, {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": mediaType,
      "X-Resume-Filename": encodeURIComponent(file.name),
    },
    body: file,
    signal,
  });

  if (!response.ok) {
    await throwResponseError(response, "Unable to upload the resume");
  }

  const resume = await readResumeResponse(response, applicationId);

  if (resume === null) {
    throw new Error("The server did not return the uploaded resume");
  }

  return resume;
}

export async function removeResume(
  applicationId: number,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`/api/applications/${applicationId}/resume`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    await throwResponseError(response, "Unable to remove the resume");
  }
}

export async function getResumeFile(
  resume: Pick<Resume, "applicationId" | "id">,
  signal?: AbortSignal,
  download = false,
): Promise<Blob> {
  const query = new URLSearchParams({ resumeId: resume.id });
  if (download) {
    query.set("download", "1");
  }
  const response = await fetch(
    `/api/applications/${resume.applicationId}/resume/file?${query}`,
    { credentials: "same-origin", signal },
  );

  if (!response.ok) {
    await throwResponseError(response, "Unable to load the resume file");
  }

  const blob = await response.blob();

  if (
    !resumeMediaTypeSchema.safeParse(blob.type).success ||
    blob.size === 0 ||
    blob.size > RESUME_MAX_BYTES
  ) {
    throw new Error("The server returned an unexpected resume file");
  }

  return blob;
}

export async function downloadResume(
  resume: Resume,
  signal?: AbortSignal,
): Promise<void> {
  const blob = await getResumeFile(resume, signal, true);
  signal?.throwIfAborted();

  if (blob.type !== resume.mediaType || blob.size !== resume.byteSize) {
    throw new Error(
      "The resume changed. Refresh its details before downloading.",
    );
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = resume.fileName;
  document.body.append(link);
  link.click();
  link.remove();

  // Let the browser consume the URL before releasing the downloaded file.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}
