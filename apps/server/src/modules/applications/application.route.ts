import { Router } from "express";
import {
  createApplication,
  deleteApplication,
  getApplication,
  getApplications,
  updateApplication,
} from "./application.controller.js";

export const applicationRouter = Router();

applicationRouter.get("/", getApplications);
applicationRouter.post("/", createApplication);
applicationRouter.get("/:applicationId", getApplication);
applicationRouter.put("/:applicationId", updateApplication);
applicationRouter.delete("/:applicationId", deleteApplication);
