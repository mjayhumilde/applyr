import type {
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
} from "@applyr/contracts";

import {
  deleteApplicationById,
  findAllApplications,
  findApplicationById,
  insertApplication,
  updateApplicationById,
} from "./application.repository.js";
import { tryCleanupUserResumes } from "../resumes/resume.service.js";

export async function listApplications(userId: string): Promise<Application[]> {
  const applications = await findAllApplications(userId);

  return applications;
}

export async function getApplication(
  userId: string,
  applicationId: number,
): Promise<Application | null> {
  return findApplicationById(userId, applicationId);
}

export async function createApplication(
  userId: string,
  input: CreateApplicationRequest,
): Promise<Application> {
  return insertApplication(userId, input);
}

export async function updateApplication(
  userId: string,
  applicationId: number,
  input: UpdateApplicationRequest,
): Promise<Application | null> {
  return updateApplicationById(userId, applicationId, input);
}

export async function deleteApplication(
  userId: string,
  applicationId: number,
): Promise<boolean> {
  const deleted = await deleteApplicationById(userId, applicationId);
  if (deleted) await tryCleanupUserResumes(userId);
  return deleted;
}
