import {
  applicationSchema,
  type Application,
  type CreateApplicationRequest,
  type UpdateApplicationRequest,
} from "@applyr/contracts";
import type { PoolClient } from "pg";
import { z } from "zod";

import { withUserTransaction } from "../../db/with-user-transaction.js";

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
    AND c.user_id = a.user_id
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
  WHERE a.user_id = $1
  ${groupApplicationsSql}
  ORDER BY
    a.date_applied DESC,
    a.id DESC;
`;

const findApplicationByIdSql = `
  ${selectApplicationsSql}
  WHERE a.user_id = $1 AND a.id = $2
  ${groupApplicationsSql};
`;

const lockApplicationByIdSql = `
  SELECT id
  FROM public.applications
  WHERE user_id = $1 AND id = $2
  FOR UPDATE;
`;

const upsertCompanySql = `
  INSERT INTO public.companies AS existing_company (
    user_id,
    name,
    website
  )
  VALUES ($1, $2, $3)
  ON CONFLICT (user_id, lower(btrim(name)))
  DO UPDATE SET
    website = COALESCE(existing_company.website, EXCLUDED.website)
  RETURNING id;
`;

const insertApplicationSql = `
  INSERT INTO public.applications (
    user_id,
    company_id,
    role,
    job_post_link,
    status,
    date_applied,
    notes
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING id;
`;

const updateApplicationSql = `
  UPDATE public.applications
  SET
    company_id = $3,
    role = $4,
    job_post_link = $5,
    status = $6,
    date_applied = $7,
    notes = $8,
    updated_at = CURRENT_TIMESTAMP
  WHERE user_id = $1 AND id = $2
  RETURNING id;
`;

const deleteApplicationSql = `
  DELETE FROM public.applications
  WHERE user_id = $1 AND id = $2
  RETURNING id;
`;

export async function findAllApplications(
  userId: string,
): Promise<Application[]> {
  return withUserTransaction(userId, async (client) => {
    const result = await client.query<RawApplicationRow>(findAllApplicationsSql, [
      userId,
    ]);

    return applicationRowsSchema.parse(result.rows);
  });
}

export async function findApplicationById(
  userId: string,
  applicationId: number,
): Promise<Application | null> {
  return withUserTransaction(userId, async (client) => {
    const result = await client.query<RawApplicationRow>(findApplicationByIdSql, [
      userId,
      applicationId,
    ]);

    return parseApplicationRow(result.rows[0]);
  });
}

export async function insertApplication(
  userId: string,
  input: CreateApplicationRequest,
): Promise<Application> {
  return withUserTransaction(userId, async (client) => {
    const companyId = await upsertCompany(client, userId, input.company);
    const applicationIdResult = await client.query<RawIdRow>(
      insertApplicationSql,
      [
        userId,
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
      [userId, applicationId],
    );
    const application = parseApplicationRow(applicationResult.rows[0]);

    if (application === null) {
      throw new Error("Created application could not be loaded");
    }

    return application;
  });
}

export async function updateApplicationById(
  userId: string,
  applicationId: number,
  input: UpdateApplicationRequest,
): Promise<Application | null> {
  return withUserTransaction(userId, async (client) => {
    const existingApplicationResult = await client.query<RawIdRow>(
      lockApplicationByIdSql,
      [userId, applicationId],
    );
    const existingApplicationRow = existingApplicationResult.rows[0];

    if (existingApplicationRow === undefined) {
      return null;
    }

    idRowSchema.parse(existingApplicationRow);

    const companyId = await upsertCompany(client, userId, input.company);
    const applicationIdResult = await client.query<RawIdRow>(
      updateApplicationSql,
      [
        userId,
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
      [userId, updatedApplicationId],
    );
    const application = parseApplicationRow(applicationResult.rows[0]);

    if (application === null) {
      throw new Error("Updated application could not be loaded");
    }

    return application;
  });
}

export async function deleteApplicationById(
  userId: string,
  applicationId: number,
): Promise<boolean> {
  return withUserTransaction(userId, async (client) => {
    const result = await client.query<RawIdRow>(deleteApplicationSql, [
      userId,
      applicationId,
    ]);
    const deletedApplicationRow = result.rows[0];

    if (deletedApplicationRow === undefined) {
      return false;
    }

    idRowSchema.parse(deletedApplicationRow);

    return true;
  });
}

async function upsertCompany(
  client: PoolClient,
  userId: string,
  company: CreateApplicationRequest["company"],
): Promise<number> {
  const companyResult = await client.query<RawIdRow>(upsertCompanySql, [
    userId,
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
