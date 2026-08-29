import { Router } from "express";
import {
  createApplication,
  getApplication,
  getApplications,
} from "./application.controller.js";

export const applicationRouter = Router();

applicationRouter.get("/", getApplications);
applicationRouter.post("/", createApplication);
applicationRouter.get("/:applicationId", getApplication);
