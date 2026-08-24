import { applicationSchema, type Application } from "@applyr/contracts";

import { pool } from "../../db/pool.js";

type RawApplicationRow = Record<string, unknown>;

const applicationRowsSchema = applicationSchema.array();

const findAllApplicationsSql = `
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
  ORDER BY
    a.date_applied DESC,
    a.id DESC;
`;

export async function findAllApplications(): Promise<Application[]> {
  const result = await pool.query<RawApplicationRow>(findAllApplicationsSql);

  return applicationRowsSchema.parse(result.rows);
}
