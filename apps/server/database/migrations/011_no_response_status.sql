BEGIN;

-- Fail safely if the table is busy instead of waiting indefinitely for its lock.
SET LOCAL lock_timeout = '5s';

-- Keep existing applications and the date/ownership constraints unchanged.
-- No Response describes an application that was sent, so its applied date stays required.
ALTER TABLE public.applications
  DROP CONSTRAINT applications_status_check,
  ADD CONSTRAINT applications_status_check CHECK (
    status IN ('Saved', 'Applied', 'Interview', 'Offer', 'Rejected', 'No Response')
  );

COMMIT;
