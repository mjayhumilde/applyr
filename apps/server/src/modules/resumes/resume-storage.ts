import { RESUME_MAX_BYTES, type ResumeMediaType } from "@applyr/contracts";
import { del, get, put } from "@vercel/blob";

import { env } from "../../config/env.js";
import { HttpError } from "../../errors/http-error.js";

const STORAGE_TIMEOUT_MS = 30_000;

export function isResumeStorageConfigured(): boolean {
  // Let the SDK resolve/refresh OIDC from Vercel's request context or env.
  // Requiring the token specifically in process.env would reject valid runtimes.
  return Boolean(env.BLOB_READ_WRITE_TOKEN || env.BLOB_STORE_ID);
}

function assertStoragePath(pathname: string): void {
  // Only server-generated resume keys are allowed; never fetch a client URL.
  if (!/^resumes\/[0-9a-f-]{36}\.(?:pdf|docx)$/.test(pathname)) {
    throw new HttpError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Invalid resume storage reference",
    );
  }
  if (!isResumeStorageConfigured()) {
    throw new HttpError(
      503,
      "INTERNAL_SERVER_ERROR",
      "Resume storage is not configured yet",
    );
  }
}

export async function putResumeFile(
  pathname: string,
  bytes: Buffer,
  mediaType: ResumeMediaType,
): Promise<void> {
  assertStoragePath(pathname);
  try {
    await put(pathname, bytes, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: mediaType,
      cacheControlMaxAge: 60,
      abortSignal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
    });
  } catch {
    // SDK errors can contain storage URLs; do not expose/log these with PII.
    throw new HttpError(
      503,
      "INTERNAL_SERVER_ERROR",
      "Resume upload failed. Try again shortly.",
    );
  }
}

export async function getResumeFile(pathname: string): Promise<Buffer> {
  assertStoragePath(pathname);
  try {
    const result = await get(pathname, {
      access: "private",
      useCache: false,
      abortSignal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
    });
    if (!result || result.statusCode !== 200) {
      throw new HttpError(404, "NOT_FOUND", "Resume file not found");
    }
    const reader = result.stream.getReader();
    const chunks: Buffer[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > RESUME_MAX_BYTES) {
          throw new HttpError(
            502,
            "INTERNAL_SERVER_ERROR",
            "Resume file exceeds the download limit",
          );
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
    if (length === 0 || length !== result.blob.size) {
      throw new HttpError(
        502,
        "INTERNAL_SERVER_ERROR",
        "Resume file could not be read completely",
      );
    }
    return Buffer.concat(chunks);
  } catch (error: unknown) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      503,
      "INTERNAL_SERVER_ERROR",
      "Resume download failed. Try again shortly.",
    );
  }
}

export async function deleteResumeFile(pathname: string): Promise<void> {
  assertStoragePath(pathname);
  try {
    await del(pathname, { abortSignal: AbortSignal.timeout(5000) });
  } catch {
    throw new HttpError(
      503,
      "INTERNAL_SERVER_ERROR",
      "Resume cleanup will be retried later",
    );
  }
}
