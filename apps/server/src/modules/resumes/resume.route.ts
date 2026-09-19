import { RESUME_MAX_BYTES } from "@applyr/contracts";
import { raw, Router, type RequestHandler } from "express";

import { HttpError } from "../../errors/http-error.js";
import {
  deleteResume,
  getResume,
  getResumeFile,
  putResume,
  requireResumeApplicationOwner,
  validateResumeUploadHeaders,
} from "./resume.controller.js";

// give params access to all routes from parent params
export const resumeRouter = Router({ mergeParams: true });
const readRawFile = raw({
  type: () => true,
  limit: RESUME_MAX_BYTES,
  inflate: false,
});

const parseResumeBytes: RequestHandler = (req, res, next) => {
  readRawFile(req, res, (error: unknown) => {
    if (error !== null && typeof error === "object" && "status" in error) {
      if (error.status === 413) {
        next(
          new HttpError(
            413,
            "VALIDATION_ERROR",
            "Resume files must not exceed 4 MiB.",
          ),
        );
        return;
      }
      if (error.status === 415) {
        next(
          new HttpError(
            415,
            "VALIDATION_ERROR",
            "Compressed upload requests are not supported.",
          ),
        );
        return;
      }
      if (error.status === 400) {
        next(
          new HttpError(
            400,
            "VALIDATION_ERROR",
            "The resume upload could not be read.",
          ),
        );
        return;
      }
    }
    next(error);
  });
};

resumeRouter.use(requireResumeApplicationOwner);
resumeRouter.get("/", getResume);
resumeRouter.put("/", validateResumeUploadHeaders, parseResumeBytes, putResume);
resumeRouter.get("/file", getResumeFile);
resumeRouter.delete("/", deleteResume);
