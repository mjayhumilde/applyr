import type {
  ApplicationEvent,
  CreateApplicationEventRequest,
} from "@applyr/contracts";

import { insertApplicationEvent } from "./application-event.repository.js";

export async function createApplicationEvent(
  userId: string,
  applicationId: number,
  input: CreateApplicationEventRequest,
): Promise<ApplicationEvent | null> {
  return insertApplicationEvent(userId, applicationId, input);
}
