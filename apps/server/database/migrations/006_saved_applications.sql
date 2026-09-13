BEGIN;

-- Fail safely if the table is busy instead of waiting indefinitely for its lock.
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.applications
  DROP CONSTRAINT applications_status_check,
  ALTER COLUMN date_applied DROP NOT NULL,
  ADD CONSTRAINT applications_status_check CHECK (
    status IN ('Saved', 'Applied', 'Interview', 'Offer', 'Rejected')
  ),
  ADD CONSTRAINT applications_status_date_applied_check CHECK (
    (status = 'Saved' AND date_applied IS NULL)
    OR (status <> 'Saved' AND date_applied IS NOT NULL)
  );

COMMIT;
