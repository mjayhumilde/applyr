BEGIN;

-- Fail safely if the table is busy instead of waiting indefinitely for its lock.
SET LOCAL lock_timeout = '5s';

-- Store the job posting as optional plain text, preserving internal line breaks.
-- Existing applications keep NULL until a description is added.
ALTER TABLE public.applications
  ADD COLUMN job_description TEXT,
  ADD CONSTRAINT applications_job_description_check CHECK (
    job_description IS NULL
    OR (
      job_description !~ '^[[:space:]]*$'
      AND char_length(job_description) <= 10000
    )
  );

COMMIT;
