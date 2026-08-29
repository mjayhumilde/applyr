BEGIN;

CREATE UNIQUE INDEX companies_normalized_name_uidx
  ON public.companies (lower(btrim(name)));

COMMIT;
