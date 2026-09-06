-- Generated with auth@1.7.2 from src/auth/auth.ts, then reviewed and formatted.
-- The transaction and explicit public schema keep this migration all-or-nothing.
-- Apply once as the schema owner; do not grant CREATE to the runtime role.
BEGIN;

CREATE TABLE public.auth_users (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.auth_sessions (
  id TEXT NOT NULL PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES public.auth_users (id) ON DELETE CASCADE
);

CREATE TABLE public.auth_accounts (
  id TEXT NOT NULL PRIMARY KEY,
  issuer TEXT NOT NULL,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES public.auth_users (id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE public.auth_verifications (
  id TEXT NOT NULL PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX auth_sessions_user_id_idx
  ON public.auth_sessions (user_id);

CREATE INDEX auth_accounts_user_id_idx
  ON public.auth_accounts (user_id);

CREATE INDEX auth_verifications_identifier_idx
  ON public.auth_verifications (identifier);

CREATE UNIQUE INDEX auth_accounts_issuer_account_id_uidx
  ON public.auth_accounts (issuer, account_id);

COMMIT;
