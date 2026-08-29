import { Router } from "express";
import { getApplications } from "./application.controller.js";

export const applicationRouter = Router();

applicationRouter.get("/", getApplications);
