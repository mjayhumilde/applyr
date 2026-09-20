BEGIN;

-- Fail safely if the table is busy instead of waiting indefinitely for its lock.
SET LOCAL lock_timeout = '5s';

-- Existing applications keep NULL when their work arrangement is not known.
ALTER TABLE public.applications
  ADD COLUMN work_type TEXT,
  ADD CONSTRAINT applications_work_type_check CHECK (
    work_type IS NULL OR work_type IN ('Remote', 'Onsite', 'Hybrid')
  );

COMMIT;
