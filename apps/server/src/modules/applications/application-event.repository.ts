import {
  applicationEventSchema,
  type ApplicationEvent,
  type CreateApplicationEventRequest,
} from "@applyr/contracts";
import { z } from "zod";

import { withUserTransaction } from "../../db/with-user-transaction.js";

type RawApplicationEventRow = Record<string, unknown>;
type RawIdRow = Record<string, unknown>;

const idRowSchema = z.object({
  id: z.number().int().positive(),
});

const lockApplicationByIdSql = `
  SELECT id
  FROM public.applications
  WHERE user_id = $1 AND id = $2
  FOR KEY SHARE;
`;

const insertApplicationEventSql = `
  INSERT INTO public.application_events (
    application_id,
    event_type,
    event_date
  )
  VALUES ($1, $2, $3)
  RETURNING
    id,
    event_type AS "eventType",
    event_date::text AS "eventDate";
`;

export async function insertApplicationEvent(
  userId: string,
  applicationId: number,
  input: CreateApplicationEventRequest,
): Promise<ApplicationEvent | null> {
  return withUserTransaction(userId, async (client) => {
    const applicationResult = await client.query<RawIdRow>(
      lockApplicationByIdSql,
      [userId, applicationId],
    );
    const applicationRow = applicationResult.rows[0];

    if (applicationRow === undefined) {
      return null;
    }

    idRowSchema.parse(applicationRow);

    const eventResult = await client.query<RawApplicationEventRow>(
      insertApplicationEventSql,
      [applicationId, input.eventType, input.eventDate],
    );
    const event = applicationEventSchema.parse(eventResult.rows[0]);

    return event;
  });
}
