import {
  applicationIdParamsSchema,
  RESUME_MAX_BYTES,
  resumeFileNameSchema,
  resumeMediaTypeSchema,
  resumeResponseSchema,
  type ResumeMediaType,
} from "@applyr/contracts";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { getAuthenticatedUserId } from "../../auth/get-authenticated-user-id.js";
import { HttpError } from "../../errors/http-error.js";
import { parseRequest } from "../../http/parse-request.js";
import * as resumeService from "./resume.service.js";

function requestIdentity(req: Request): {
  userId: string;
  applicationId: number;
} {
  const userId = getAuthenticatedUserId(req);
  const { applicationId } = parseRequest(
    applicationIdParamsSchema,
    req.params,
    "params",
  );
  return { userId, applicationId };
}

export async function requireResumeApplicationOwner(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId, applicationId } = requestIdentity(req);
  await resumeService.assertResumeApplicationOwner(userId, applicationId);
  next();
}

function parseUploadHeaders(req: Request): {
  fileName: string;
  mediaType: ResumeMediaType;
} {
  const contentType = req
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
  const mediaType = resumeMediaTypeSchema.safeParse(contentType);
  if (!mediaType.success) {
    throw new HttpError(415, "VALIDATION_ERROR", "Upload a PDF or DOCX file.");
  }
  const encoding = req.get("content-encoding");
  if (encoding !== undefined && encoding.toLowerCase() !== "identity") {
    throw new HttpError(
      415,
      "VALIDATION_ERROR",
      "Compressed upload requests are not supported.",
    );
  }

  let decodedName: string;
  try {
    decodedName = decodeURIComponent(req.get("x-resume-filename") ?? "");
  } catch {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "The resume filename is invalid.",
    );
  }
  const fileName = resumeFileNameSchema.safeParse(decodedName);
  if (!fileName.success) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Provide a valid resume filename of at most 255 characters.",
    );
  }
  const length = req.get("content-length");
  if (length !== undefined && Number(length) > RESUME_MAX_BYTES) {
    throw new HttpError(
      413,
      "VALIDATION_ERROR",
      "Resume files must not exceed 4 MiB.",
    );
  }
  return { fileName: fileName.data, mediaType: mediaType.data };
}

export function validateResumeUploadHeaders(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  parseUploadHeaders(req);
  next();
}

export async function getResume(req: Request, res: Response): Promise<void> {
  const { userId, applicationId } = requestIdentity(req);
  const resume = await resumeService.getResume(userId, applicationId);
  res.status(200).json(resumeResponseSchema.parse({ data: resume }));
}

export async function putResume(req: Request, res: Response): Promise<void> {
  const { userId, applicationId } = requestIdentity(req);
  const { fileName, mediaType } = parseUploadHeaders(req);
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Choose a non-empty resume file.",
    );
  }
  const resume = await resumeService.uploadResume(
    userId,
    applicationId,
    req.body,
    fileName,
    mediaType,
  );
  res.status(200).json(resumeResponseSchema.parse({ data: resume }));
}

const downloadQuerySchema = z.object({
  download: z.enum(["0", "1"]).optional(),
  resumeId: z.uuid().optional(),
});

export async function getResumeFile(
  req: Request,
  res: Response,
): Promise<void> {
  const { userId, applicationId } = requestIdentity(req);
  const query = downloadQuerySchema.safeParse(req.query);
  if (!query.success) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Provide a valid resume ID and a download parameter of 0 or 1.",
    );
  }
  const { resume, bytes } = await resumeService.readResumeFile(
    userId,
    applicationId,
    query.data.resumeId,
  );
  const disposition = query.data.download === "1" ? "attachment" : "inline";
  const asciiName = resume.fileName.replace(/[^a-zA-Z0-9_. -]/g, "_");
  const utf8Name = encodeURIComponent(resume.fileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  res.set({
    "Content-Type": resume.mediaType,
    "Content-Length": String(bytes.length),
    "Content-Disposition": `${disposition}; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "sandbox; default-src 'none'",
  });
  res.status(200).send(bytes);
}

export async function deleteResume(req: Request, res: Response): Promise<void> {
  const { userId, applicationId } = requestIdentity(req);
  await resumeService.removeResume(userId, applicationId);
  res.status(204).send();
}
