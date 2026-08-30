import {
  applicationEventSchema,
  type ApplicationEvent,
  type CreateApplicationEventRequest,
} from "@applyr/contracts";
import { z } from "zod";

import { pool } from "../../db/pool.js";

type RawApplicationEventRow = Record<string, unknown>;
type RawIdRow = Record<string, unknown>;

const idRowSchema = z.object({
  id: z.number().int().positive(),
});

const lockApplicationByIdSql = `
  SELECT id
  FROM public.applications
  WHERE id = $1
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
  applicationId: number,
  input: CreateApplicationEventRequest,
): Promise<ApplicationEvent | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const applicationResult = await client.query<RawIdRow>(
      lockApplicationByIdSql,
      [applicationId],
    );
    const applicationRow = applicationResult.rows[0];

    if (applicationRow === undefined) {
      await client.query("ROLLBACK");
      return null;
    }

    idRowSchema.parse(applicationRow);

    const eventResult = await client.query<RawApplicationEventRow>(
      insertApplicationEventSql,
      [applicationId, input.eventType, input.eventDate],
    );
    const event = applicationEventSchema.parse(eventResult.rows[0]);

    await client.query("COMMIT");

    return event;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
