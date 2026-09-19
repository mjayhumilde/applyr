import { randomUUID } from "node:crypto";
import {
  resumeSchema,
  type Resume,
  type ResumeMediaType,
} from "@applyr/contracts";

import { HttpError } from "../../errors/http-error.js";
import { validateResumeFile } from "./resume-file.js";
import {
  claimResumeCleanup,
  detachReadyResume,
  finalizeResumeUpload,
  findReadyResume,
  markResumeDeleted,
  rejectPendingResumeUpload,
  reserveResumeUpload,
  type ResumeReservation,
} from "./resume.repository.js";
import {
  deleteResumeFile,
  getResumeFile,
  isResumeStorageConfigured,
  putResumeFile,
} from "./resume-storage.js";

export { assertResumeApplicationOwner } from "./resume.repository.js";

function requireResumeStorage(): void {
  if (!isResumeStorageConfigured()) {
    throw new HttpError(
      503,
      "INTERNAL_SERVER_ERROR",
      "Resume storage is not configured yet.",
    );
  }
}

export async function getResume(
  userId: string,
  applicationId: number,
): Promise<Resume | null> {
  const stored = await findReadyResume(userId, applicationId);
  return stored === null ? null : resumeSchema.parse(stored);
}

export async function uploadResume(
  userId: string,
  applicationId: number,
  bytes: Buffer,
  fileName: string,
  mediaType: ResumeMediaType,
): Promise<Resume> {
  requireResumeStorage();
  await tryCleanupUserResumes(userId);

  const id = randomUUID();
  const extension = mediaType === "application/pdf" ? "pdf" : "docx";
  const reservation: ResumeReservation = {
    id,
    applicationId,
    objectPathname: `resumes/${id}.${extension}`,
    fileName,
    mediaType,
    byteSize: bytes.length,
  };

  // Persist the pathname BEFORE any external write. If the upload or COMMIT
  // response is lost, a later cleanup can still find the object safely.
  await reserveResumeUpload(userId, reservation);
  try {
    await validateResumeFile(bytes, fileName, mediaType);
  } catch (error: unknown) {
    // Invalid documents still consume an upload attempt. No object write has
    // started, so this reservation can safely become a tombstone immediately.
    try {
      await rejectPendingResumeUpload(userId, reservation.id);
    } catch {
      console.warn("Rejected resume reservation will be cleaned up later");
    }
    throw error;
  }
  await putResumeFile(reservation.objectPathname, bytes, mediaType);
  const resume = await finalizeResumeUpload(userId, reservation);

  // A failed cleanup must not turn a successful replacement into an API error.
  // In particular, never delete the new object after an uncertain DB commit.
  await tryCleanupUserResumes(userId);
  return resume;
}

export async function readResumeFile(
  userId: string,
  applicationId: number,
  expectedResumeId?: string,
): Promise<{ resume: Resume; bytes: Buffer }> {
  const stored = await findReadyResume(userId, applicationId);
  if (stored === null) {
    throw new HttpError(404, "NOT_FOUND", "Resume not found");
  }
  if (expectedResumeId !== undefined && stored.id !== expectedResumeId) {
    throw new HttpError(
      409,
      "VALIDATION_ERROR",
      "The resume changed. Refresh this application and try again.",
    );
  }
  requireResumeStorage();
  const bytes = await getResumeFile(stored.objectPathname);
  if (bytes.length !== stored.byteSize) {
    throw new HttpError(
      502,
      "INTERNAL_SERVER_ERROR",
      "This resume could not be loaded. Try again later.",
    );
  }
  return { resume: resumeSchema.parse(stored), bytes };
}

export async function removeResume(
  userId: string,
  applicationId: number,
): Promise<void> {
  await detachReadyResume(userId, applicationId);
  await tryCleanupUserResumes(userId);
}

export async function cleanupUserResumes(
  userId: string,
): Promise<{ deletedCount: number; failedCount: number }> {
  requireResumeStorage();
  const candidates = await claimResumeCleanup(userId);
  // Four objects at most, all awaited. No background promises survive a Vercel
  // request, and no database connection is held during object-storage calls.
  const results = await Promise.allSettled(
    candidates.map(async (candidate) => {
      await deleteResumeFile(candidate.objectPathname);
      await markResumeDeleted(userId, candidate.id);
    }),
  );
  return {
    deletedCount: results.filter((result) => result.status === "fulfilled")
      .length,
    failedCount: results.filter((result) => result.status === "rejected")
      .length,
  };
}

export async function tryCleanupUserResumes(userId: string): Promise<void> {
  if (!isResumeStorageConfigured()) return;
  try {
    const result = await cleanupUserResumes(userId);
    if (result.failedCount > 0) {
      console.warn("Resume cleanup deferred; tracked objects will be retried", {
        failedCount: result.failedCount,
      });
    }
  } catch {
    // Avoid logging SDK errors that may contain storage credentials or URLs.
    console.warn("Resume cleanup deferred; tracked objects will be retried");
  }
}
