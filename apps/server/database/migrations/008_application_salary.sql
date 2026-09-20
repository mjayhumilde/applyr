BEGIN;

-- Fail safely if the table is busy instead of waiting indefinitely for its lock.
SET LOCAL lock_timeout = '5s';

-- Salary is a display label (for example, a range or "Negotiable"), not an
-- amount used for calculations. Existing applications keep NULL until edited.
ALTER TABLE public.applications
  ADD COLUMN salary TEXT,
  ADD CONSTRAINT applications_salary_check CHECK (
    salary IS NULL
    OR (
      salary !~ '^[[:space:]]*$'
      AND char_length(salary) <= 255
    )
  );

COMMIT;
