BEGIN;

SET LOCAL lock_timeout = '5s';

-- File bytes live in private object storage. Rows also track uploads and cleanup
-- so a failed request never leaves us without the pathname needed for a retry.
CREATE TABLE public.application_resumes (
  id UUID PRIMARY KEY,
  application_id INTEGER REFERENCES public.applications (id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES public.auth_users (id) ON DELETE RESTRICT,
  object_pathname TEXT NOT NULL UNIQUE,
  file_name VARCHAR(255) NOT NULL,
  media_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  uploaded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT application_resumes_pathname_not_blank
    CHECK (btrim(object_pathname) <> ''),
  CONSTRAINT application_resumes_file_name_not_blank
    CHECK (btrim(file_name) <> ''),
  CONSTRAINT application_resumes_media_type_check CHECK (
    media_type IN (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  ),
  CONSTRAINT application_resumes_byte_size_check
    CHECK (byte_size > 0 AND byte_size <= 4194304),
  CONSTRAINT application_resumes_state_check
    CHECK (state IN ('pending', 'ready', 'cleanup', 'deleted')),
  CONSTRAINT application_resumes_ready_timestamp_check
    CHECK (state <> 'ready' OR uploaded_at IS NOT NULL)
);

CREATE UNIQUE INDEX application_resumes_ready_application_uidx
  ON public.application_resumes (application_id) WHERE state = 'ready';
CREATE INDEX application_resumes_application_id_idx
  ON public.application_resumes (application_id);
CREATE INDEX application_resumes_user_id_created_at_idx
  ON public.application_resumes (user_id, created_at DESC);
CREATE INDEX application_resumes_user_id_state_idx
  ON public.application_resumes (user_id, state);

ALTER TABLE public.application_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_resumes FORCE ROW LEVEL SECURITY;
CREATE POLICY application_resumes_owner_policy ON public.application_resumes
  USING (user_id = nullif(current_setting('applyr.user_id', true), ''))
  WITH CHECK (
    user_id = nullif(current_setting('applyr.user_id', true), '')
    AND (
      application_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.applications AS a
        WHERE a.id = application_resumes.application_id
          AND a.user_id = nullif(current_setting('applyr.user_id', true), '')
      )
    )
  );

-- Run as the schema owner after applying migrations 001-006.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.application_resumes TO applyr_app;

COMMIT;
