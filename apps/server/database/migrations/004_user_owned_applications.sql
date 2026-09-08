BEGIN;

SET LOCAL lock_timeout = '5s';

-- Stop concurrent application writes while legacy ownership is assigned.
LOCK TABLE public.companies, public.applications, public.application_events
  IN ACCESS EXCLUSIVE MODE;

ALTER TABLE public.companies ADD COLUMN user_id TEXT;
ALTER TABLE public.applications ADD COLUMN user_id TEXT;

DO $$
DECLARE
  legacy_owner_id TEXT := nullif(current_setting('applyr.legacy_owner_id', true), '');
BEGIN
  IF EXISTS (SELECT 1 FROM public.companies)
     OR EXISTS (SELECT 1 FROM public.applications) THEN
    IF legacy_owner_id IS NULL THEN
      RAISE EXCEPTION 'Existing records need an explicitly confirmed owner. Set applyr.legacy_owner_id to that auth_users.id in this connection before running migration 004.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.auth_users WHERE id = legacy_owner_id) THEN
      RAISE EXCEPTION 'The selected legacy owner does not exist in auth_users.';
    END IF;

    UPDATE public.companies SET user_id = legacy_owner_id;
    UPDATE public.applications SET user_id = legacy_owner_id;
  END IF;
END
$$;

ALTER TABLE public.companies
  ALTER COLUMN user_id SET NOT NULL,
  ADD CONSTRAINT companies_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.auth_users (id) ON DELETE RESTRICT,
  ADD CONSTRAINT companies_user_id_id_key UNIQUE (user_id, id);

ALTER TABLE public.applications
  ALTER COLUMN user_id SET NOT NULL,
  ADD CONSTRAINT applications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.auth_users (id) ON DELETE RESTRICT,
  DROP CONSTRAINT applications_company_id_fkey,
  ADD CONSTRAINT applications_user_id_company_id_fkey
    FOREIGN KEY (user_id, company_id)
    REFERENCES public.companies (user_id, id) ON DELETE RESTRICT;

DROP INDEX public.companies_normalized_name_uidx;
CREATE UNIQUE INDEX companies_user_id_normalized_name_uidx
  ON public.companies (user_id, lower(btrim(name)));

DROP INDEX public.applications_company_id_idx;
DROP INDEX public.applications_date_applied_idx;
DROP INDEX public.applications_status_date_applied_idx;

CREATE INDEX applications_user_id_company_id_idx
  ON public.applications (user_id, company_id);
CREATE INDEX applications_user_id_date_applied_idx
  ON public.applications (user_id, date_applied DESC, id DESC);
CREATE INDEX applications_user_id_status_date_applied_idx
  ON public.applications (user_id, status, date_applied DESC, id DESC);

-- Auth tables remain available to Better Auth before a user is signed in.
-- Business data requires the transaction-local identity set by the server.
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;
CREATE POLICY companies_owner_policy ON public.companies
  USING (user_id = nullif(current_setting('applyr.user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('applyr.user_id', true), ''));

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications FORCE ROW LEVEL SECURITY;
CREATE POLICY applications_owner_policy ON public.applications
  USING (user_id = nullif(current_setting('applyr.user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('applyr.user_id', true), ''));

-- Events belong to the same user as their parent application.
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_events FORCE ROW LEVEL SECURITY;
CREATE POLICY application_events_owner_policy ON public.application_events
  USING (EXISTS (
    SELECT 1 FROM public.applications AS a
    WHERE a.id = application_events.application_id
      AND a.user_id = nullif(current_setting('applyr.user_id', true), '')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.applications AS a
    WHERE a.id = application_events.application_id
      AND a.user_id = nullif(current_setting('applyr.user_id', true), '')
  ));

COMMIT;
