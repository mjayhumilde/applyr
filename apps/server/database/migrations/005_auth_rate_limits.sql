-- Matches Better Auth 1.7.2's database rate-limit model in src/auth/auth.ts.
-- Apply once as the schema owner before starting the production API.
BEGIN;

CREATE TABLE public.auth_rate_limits (
  id TEXT NOT NULL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  -- Better Auth stores this timestamp as epoch milliseconds, not TIMESTAMPTZ.
  last_request BIGINT NOT NULL
);

-- Better Auth opportunistically prunes expired counters when a window resets.
CREATE INDEX auth_rate_limits_last_request_idx
  ON public.auth_rate_limits (last_request);

-- No user RLS: throttling must work before a visitor has a signed-in session.
REVOKE ALL ON public.auth_rate_limits FROM PUBLIC;

COMMIT;
