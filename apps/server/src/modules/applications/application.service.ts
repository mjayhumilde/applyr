import type { Application } from "@applyr/contracts";

import { findAllApplications } from "./application.repository.js";

export async function listApplications(): Promise<Application[]> {
  const applications = await findAllApplications();

  return applications;
}
