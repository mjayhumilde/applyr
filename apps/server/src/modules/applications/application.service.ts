import type { Application, CreateApplicationRequest } from "@applyr/contracts";

import {
  findAllApplications,
  findApplicationById,
  insertApplication,
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
