BEGIN;

CREATE TABLE public.companies (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255) NOT NULL,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT companies_pkey PRIMARY KEY (id),
  CONSTRAINT companies_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT companies_website_not_blank CHECK (
    website IS NULL OR btrim(website) <> ''
  )
);

CREATE TABLE public.applications (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  company_id INTEGER NOT NULL,
  role VARCHAR(255) NOT NULL,
  job_post_link TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Applied',
  date_applied DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT applications_pkey PRIMARY KEY (id),
  CONSTRAINT applications_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES public.companies (id)
    ON DELETE RESTRICT,
  CONSTRAINT applications_role_not_blank CHECK (btrim(role) <> ''),
  CONSTRAINT applications_job_post_link_not_blank CHECK (
    job_post_link IS NULL OR btrim(job_post_link) <> ''
  ),
  CONSTRAINT applications_status_check CHECK (
    status IN ('Applied', 'Interview', 'Offer', 'Rejected')
  )
);

CREATE TABLE public.application_events (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  application_id INTEGER NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT application_events_pkey PRIMARY KEY (id),
  CONSTRAINT application_events_application_id_fkey
    FOREIGN KEY (application_id)
    REFERENCES public.applications (id)
    ON DELETE CASCADE,
  CONSTRAINT application_events_event_type_not_blank CHECK (
    btrim(event_type) <> ''
  )
);

CREATE INDEX applications_company_id_idx
  ON public.applications (company_id);

CREATE INDEX applications_date_applied_idx
  ON public.applications (date_applied DESC, id DESC);

CREATE INDEX applications_status_date_applied_idx
  ON public.applications (status, date_applied DESC, id DESC);

CREATE INDEX application_events_application_id_event_date_idx
  ON public.application_events (application_id, event_date, id);

COMMIT;
