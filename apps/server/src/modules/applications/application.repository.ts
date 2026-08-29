import {
  applicationSchema,
  type Application,
  type CreateApplicationRequest,
  type UpdateApplicationRequest,
} from "@applyr/contracts";
import type { PoolClient } from "pg";
import { z } from "zod";

import { pool } from "../../db/pool.js";

type RawApplicationRow = Record<string, unknown>;
type RawIdRow = Record<string, unknown>;

const applicationRowsSchema = applicationSchema.array();
const idRowSchema = z.object({
  id: z.number().int().positive(),
});

const selectApplicationsSql = `
  SELECT
    a.id,
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'website', c.website
    ) AS company,
    a.role,
    a.job_post_link AS "jobPostLink",
    a.status,
    a.date_applied::text AS "dateApplied",
    a.notes,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ae.id,
          'eventType', ae.event_type,
          'eventDate', ae.event_date::text
        )
        ORDER BY ae.event_date, ae.id
      ) FILTER (
        WHERE ae.id IS NOT NULL
      ),
      '[]'::jsonb
    ) AS events
  FROM public.applications AS a
  JOIN public.companies AS c
    ON c.id = a.company_id
  LEFT JOIN public.application_events AS ae
    ON ae.application_id = a.id
`;

const groupApplicationsSql = `
  GROUP BY
    a.id,
    c.id,
    c.name,
    c.website,
    a.role,
    a.job_post_link,
    a.status,
    a.date_applied,
    a.notes
`;

const findAllApplicationsSql = `
  ${selectApplicationsSql}
  ${groupApplicationsSql}
  ORDER BY
    a.date_applied DESC,
    a.id DESC;
`;

const findApplicationByIdSql = `
  ${selectApplicationsSql}
  WHERE a.id = $1
  ${groupApplicationsSql};
`;

const lockApplicationByIdSql = `
  SELECT id
  FROM public.applications
  WHERE id = $1
  FOR UPDATE;
`;

const upsertCompanySql = `
  INSERT INTO public.companies AS existing_company (
    name,
    website
  )
  VALUES ($1, $2)
  ON CONFLICT (lower(btrim(name)))
  DO UPDATE SET
    website = COALESCE(existing_company.website, EXCLUDED.website)
  RETURNING id;
`;

const insertApplicationSql = `
  INSERT INTO public.applications (
    company_id,
    role,
    job_post_link,
    status,
    date_applied,
    notes
  )
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING id;
`;

const updateApplicationSql = `
  UPDATE public.applications
  SET
    company_id = $2,
    role = $3,
    job_post_link = $4,
    status = $5,
    date_applied = $6,
    notes = $7,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $1
  RETURNING id;
`;

const deleteApplicationSql = `
  DELETE FROM public.applications
  WHERE id = $1
  RETURNING id;
`;

export async function findAllApplications(): Promise<Application[]> {
  const result = await pool.query<RawApplicationRow>(findAllApplicationsSql);

  return applicationRowsSchema.parse(result.rows);
}

export async function findApplicationById(
  applicationId: number,
): Promise<Application | null> {
  const result = await pool.query<RawApplicationRow>(findApplicationByIdSql, [
    applicationId,
  ]);

  return parseApplicationRow(result.rows[0]);
}

export async function insertApplication(
  input: CreateApplicationRequest,
): Promise<Application> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const companyId = await upsertCompany(client, input.company);
    const applicationIdResult = await client.query<RawIdRow>(
      insertApplicationSql,
      [
        companyId,
        input.role,
        input.jobPostLink,
        input.status,
        input.dateApplied,
        input.notes,
      ],
    );
    const { id: applicationId } = idRowSchema.parse(
      applicationIdResult.rows[0],
    );

    const applicationResult = await client.query<RawApplicationRow>(
      findApplicationByIdSql,
      [applicationId],
    );
    const application = parseApplicationRow(applicationResult.rows[0]);

    if (application === null) {
      throw new Error("Created application could not be loaded");
    }

    await client.query("COMMIT");

    return application;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateApplicationById(
  applicationId: number,
  input: UpdateApplicationRequest,
): Promise<Application | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingApplicationResult = await client.query<RawIdRow>(
      lockApplicationByIdSql,
      [applicationId],
    );
    const existingApplicationRow = existingApplicationResult.rows[0];

    if (existingApplicationRow === undefined) {
      await client.query("ROLLBACK");
      return null;
    }

    idRowSchema.parse(existingApplicationRow);

    const companyId = await upsertCompany(client, input.company);
    const applicationIdResult = await client.query<RawIdRow>(
      updateApplicationSql,
      [
        applicationId,
        companyId,
        input.role,
        input.jobPostLink,
        input.status,
        input.dateApplied,
        input.notes,
      ],
    );
    const updatedApplicationRow = applicationIdResult.rows[0];

    if (updatedApplicationRow === undefined) {
      throw new Error("Locked application could not be updated");
    }

    const { id: updatedApplicationId } = idRowSchema.parse(
      updatedApplicationRow,
    );
    const applicationResult = await client.query<RawApplicationRow>(
      findApplicationByIdSql,
      [updatedApplicationId],
    );
    const application = parseApplicationRow(applicationResult.rows[0]);

    if (application === null) {
      throw new Error("Updated application could not be loaded");
    }

    await client.query("COMMIT");

    return application;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteApplicationById(
  applicationId: number,
): Promise<boolean> {
  const result = await pool.query<RawIdRow>(deleteApplicationSql, [
    applicationId,
  ]);
  const deletedApplicationRow = result.rows[0];

  if (deletedApplicationRow === undefined) {
    return false;
  }

  idRowSchema.parse(deletedApplicationRow);

  return true;
}

async function upsertCompany(
  client: PoolClient,
  company: CreateApplicationRequest["company"],
): Promise<number> {
  const companyResult = await client.query<RawIdRow>(upsertCompanySql, [
    company.name,
    company.website,
  ]);

  return idRowSchema.parse(companyResult.rows[0]).id;
}

function parseApplicationRow(
  row: RawApplicationRow | undefined,
): Application | null {
  return row === undefined ? null : applicationSchema.parse(row);
}
