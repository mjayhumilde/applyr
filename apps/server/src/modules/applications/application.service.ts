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

export async function listApplications(): Promise<Application[]> {
  const applications = await findAllApplications();

  return applications;
}

export async function getApplication(
  applicationId: number,
): Promise<Application | null> {
  return findApplicationById(applicationId);
}

export async function createApplication(
  input: CreateApplicationRequest,
): Promise<Application> {
  return insertApplication(input);
}

export async function updateApplication(
  applicationId: number,
  input: UpdateApplicationRequest,
): Promise<Application | null> {
  return updateApplicationById(applicationId, input);
}

export async function deleteApplication(
  applicationId: number,
): Promise<boolean> {
  return deleteApplicationById(applicationId);
}
