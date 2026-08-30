import type {
  ApplicationEvent,
  CreateApplicationEventRequest,
} from "@applyr/contracts";

import { insertApplicationEvent } from "./application-event.repository.js";

export async function createApplicationEvent(
  applicationId: number,
  input: CreateApplicationEventRequest,
): Promise<ApplicationEvent | null> {
  return insertApplicationEvent(applicationId, input);
}
