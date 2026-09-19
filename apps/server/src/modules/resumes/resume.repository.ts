import {
  resumeSchema,
  type Resume,
  type ResumeMediaType,
} from "@applyr/contracts";
import type { PoolClient } from "pg";
import { z } from "zod";

import { withUserTransaction } from "../../db/with-user-transaction.js";
import { HttpError } from "../../errors/http-error.js";

const USER_STORAGE_LIMIT_BYTES = 50 * 1024 * 1024;
const HOURLY_UPLOAD_LIMIT = 20;
const CLEANUP_BATCH_SIZE = 4;

const storedResumeSchema = resumeSchema.extend({
  objectPathname: z.string().min(1),
});
const cleanupCandidateSchema = z.object({
  id: z.uuid(),
  objectPathname: z.string().min(1),
});
const quotaSchema = z.object({
  storedBytes: z.coerce.number().int().nonnegative(),
  recentUploads: z.coerce.number().int().nonnegative(),
});

export type StoredResume = z.infer<typeof storedResumeSchema>;
export type CleanupCandidate = z.infer<typeof cleanupCandidateSchema>;
export type ResumeReservation = {
  id: string;
  applicationId: number;
  objectPathname: string;
  fileName: string;
  mediaType: ResumeMediaType;
  byteSize: number;
};

const selectReadyResumeSql = `
  SELECT id, application_id AS "applicationId", file_name AS "fileName",
    media_type AS "mediaType", byte_size AS "byteSize",
    uploaded_at AS "uploadedAt", object_pathname AS "objectPathname"
  FROM public.application_resumes
  WHERE user_id = $1 AND application_id = $2 AND state = 'ready';
`;

// node-postgres returns timestamptz as Date; contracts expose an ISO string.
function parseStoredResume(row: Record<string, unknown>): StoredResume {
  return storedResumeSchema.parse({
    ...row,
    uploadedAt:
      row.uploadedAt instanceof Date
        ? row.uploadedAt.toISOString()
        : row.uploadedAt,
  });
}

async function requireApplication(
  client: PoolClient,
  userId: string,
  applicationId: number,
  lock = false,
): Promise<void> {
  const result = await client.query(
    `SELECT id FROM public.applications
     WHERE user_id = $1 AND id = $2 ${lock ? "FOR UPDATE" : ""};`,
    [userId, applicationId],
  );
  if (result.rowCount === 0) {
    throw new HttpError(404, "NOT_FOUND", "Application not found");
  }
}

export async function assertResumeApplicationOwner(
  userId: string,
  applicationId: number,
): Promise<void> {
  await withUserTransaction(userId, (client) =>
    requireApplication(client, userId, applicationId),
  );
}

export async function findReadyResume(
  userId: string,
  applicationId: number,
): Promise<StoredResume | null> {
  return withUserTransaction(userId, async (client) => {
    await requireApplication(client, userId, applicationId);
    const result = await client.query<Record<string, unknown>>(
      selectReadyResumeSql,
      [userId, applicationId],
    );
    const row = result.rows[0];
    return row === undefined ? null : parseStoredResume(row);
  });
}

export async function reserveResumeUpload(
  userId: string,
  reservation: ResumeReservation,
): Promise<void> {
  await withUserTransaction(userId, async (client) => {
    // A transaction-local lock serializes quotas across this user's requests,
    // including concurrent uploads to different applications/instances.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`applyr:resume-quota:${userId}`],
    );
    await requireApplication(client, userId, reservation.applicationId, true);
    const result = await client.query<Record<string, unknown>>(
      `SELECT
        COALESCE(sum(byte_size) FILTER (WHERE state <> 'deleted'), 0) AS "storedBytes",
        count(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour') AS "recentUploads"
       FROM public.application_resumes WHERE user_id = $1;`,
      [userId],
    );
    const quota = quotaSchema.parse(result.rows[0]);
    if (quota.recentUploads >= HOURLY_UPLOAD_LIMIT) {
      throw new HttpError(
        429,
        "VALIDATION_ERROR",
        "Resume upload limit reached. Try again in an hour.",
      );
    }
    if (quota.storedBytes + reservation.byteSize > USER_STORAGE_LIMIT_BYTES) {
      throw new HttpError(
        413,
        "VALIDATION_ERROR",
        "Resume storage limit reached (50 MiB). Remove an existing resume and try again.",
      );
    }
    await client.query(
      `INSERT INTO public.application_resumes
        (id, application_id, user_id, object_pathname, file_name, media_type, byte_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        reservation.id,
        reservation.applicationId,
        userId,
        reservation.objectPathname,
        reservation.fileName,
        reservation.mediaType,
        reservation.byteSize,
      ],
    );
  });
}

export async function finalizeResumeUpload(
  userId: string,
  reservation: ResumeReservation,
): Promise<Resume> {
  return withUserTransaction(userId, async (client) => {
    await requireApplication(client, userId, reservation.applicationId, true);
    const pending = await client.query(
      `SELECT id FROM public.application_resumes
       WHERE id = $1 AND user_id = $2 AND application_id = $3 AND state = 'pending'
         AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
       FOR UPDATE;`,
      [reservation.id, userId, reservation.applicationId],
    );
    if (pending.rowCount === 0) {
      throw new HttpError(
        409,
        "VALIDATION_ERROR",
        "This resume upload expired. Upload the file again.",
      );
    }
    await client.query(
      `UPDATE public.application_resumes
       SET state = 'cleanup', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND application_id = $2 AND state = 'ready';`,
      [userId, reservation.applicationId],
    );
    await client.query(
      `UPDATE public.application_resumes
       SET state = 'ready', uploaded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2;`,
      [reservation.id, userId],
    );
    const ready = await client.query<Record<string, unknown>>(
      selectReadyResumeSql,
      [userId, reservation.applicationId],
    );
    const row = ready.rows[0];
    if (row === undefined)
      throw new Error("Finalized resume could not be loaded");
    return resumeSchema.parse(parseStoredResume(row));
  });
}

export async function rejectPendingResumeUpload(
  userId: string,
  resumeId: string,
): Promise<void> {
  // This is only called before object storage has been invoked. The tombstone
  // retains the failed validation attempt for the hourly upload limit.
  await withUserTransaction(userId, async (client) => {
    await client.query(
      `UPDATE public.application_resumes
       SET state = 'deleted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND state = 'pending';`,
      [resumeId, userId],
    );
  });
}

export async function detachReadyResume(
  userId: string,
  applicationId: number,
): Promise<void> {
  await withUserTransaction(userId, async (client) => {
    await requireApplication(client, userId, applicationId, true);
    await client.query(
      `UPDATE public.application_resumes
       SET state = 'cleanup', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND application_id = $2 AND state = 'ready';`,
      [userId, applicationId],
    );
  });
}

export async function claimResumeCleanup(
  userId: string,
): Promise<CleanupCandidate[]> {
  return withUserTransaction(userId, async (client) => {
    const result = await client.query<Record<string, unknown>>(
      `WITH candidates AS (
        SELECT id FROM public.application_resumes
        WHERE user_id = $1 AND (
          state = 'cleanup'
          OR (state = 'ready' AND application_id IS NULL)
          OR (state = 'pending' AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 hour')
        )
        ORDER BY updated_at, id LIMIT $2 FOR UPDATE SKIP LOCKED
       )
       UPDATE public.application_resumes AS r
       SET state = 'cleanup', updated_at = CURRENT_TIMESTAMP
       FROM candidates AS c WHERE r.id = c.id AND r.user_id = $1
       RETURNING r.id, r.object_pathname AS "objectPathname";`,
      [userId, CLEANUP_BATCH_SIZE],
    );
    // Keep tombstones for at least an hour so deletes cannot bypass upload limits.
    await client.query(
      `DELETE FROM public.application_resumes
       WHERE user_id = $1 AND state = 'deleted'
         AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
         AND updated_at < CURRENT_TIMESTAMP - INTERVAL '1 hour';`,
      [userId],
    );
    return cleanupCandidateSchema.array().parse(result.rows);
  });
}

export async function markResumeDeleted(
  userId: string,
  resumeId: string,
): Promise<void> {
  await withUserTransaction(userId, async (client) => {
    await client.query(
      `UPDATE public.application_resumes
       SET state = 'deleted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND state = 'cleanup';`,
      [resumeId, userId],
    );
  });
}
