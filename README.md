# Applyr

Applyr is a full-stack job application tracker. It keeps companies, job
applications, application statuses, and important events in one place instead of a
spreadsheet.

## MVP features

- Sign in with Google and sign out through database-backed sessions.
- Keep each user's applications, companies, events, and dashboard counts private.
- Create, view, edit, and delete job applications.
- Track applications through `Applied`, `Interview`, `Offer`, and `Rejected`.
- Add dated events such as interviews and follow-ups.
- Filter applications by company, status, or application date.
- View total applications and status counts on the dashboard.

## Technology

- React, React Router, TypeScript, Tailwind CSS, and Vite
- Node.js, Express, TypeScript, and Zod
- Better Auth for Google sign-in and session management
- PostgreSQL through raw parameterized SQL with `pg`
- npm workspaces for the monorepo

```text
applyr/
|-- apps/
|   |-- server/      Express API and PostgreSQL access
|   `-- web/         React application
`-- packages/
    `-- contracts/   Shared Zod schemas and inferred TypeScript types
```

## Prerequisites

- Node.js `>=22.12.0` (Node.js 24 is recommended)
- npm
- PostgreSQL and the `psql` command-line client

The project was developed with Node.js 24 and PostgreSQL 18.

## 1. Install dependencies

From the repository root:

```bash
npm ci
```

## 2. Create the local database

For a fresh local setup, use an administrator to own the database and apply
migrations. The runtime role gets only the table permissions the app needs;
it should not be able to create or drop tables.

Run these commands as the PostgreSQL administrator:

```bash
psql -U postgres -d postgres -c "CREATE ROLE applyr_app WITH LOGIN PASSWORD 'CHOOSE_A_LOCAL_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;"
psql -U postgres -d postgres -c "CREATE DATABASE job_tracker;"
```

Use a local password that is not reused anywhere else. If it contains reserved
URL characters such as `@`, `:`, `/`, or `#`, percent-encode them in the
connection URL.

If `psql` is not on `PATH` on Windows, use its full path. With PostgreSQL 18 in
Git Bash, for example:

```bash
"/c/Program Files/PostgreSQL/18/bin/psql.exe" --version
```

## 3. Apply the migrations

Run each migration in numerical order as the schema owner (`postgres` for this
local setup):

```bash
psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -f apps/server/database/migrations/001_initial_schema.sql
psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -f apps/server/database/migrations/002_unique_company_name.sql
psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -f apps/server/database/migrations/003_auth_schema.sql
psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -f apps/server/database/migrations/004_user_owned_applications.sql
psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -c "GRANT USAGE ON SCHEMA public TO applyr_app; GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies, public.applications, public.application_events, public.auth_users, public.auth_sessions, public.auth_accounts, public.auth_verifications TO applyr_app; GRANT USAGE ON SEQUENCE public.companies_id_seq, public.applications_id_seq, public.application_events_id_seq TO applyr_app;"
```

These migrations are sequential and one-way. Do not rerun a migration after it
succeeds. Migration 004 needs no legacy owner when the business tables are empty.
The project deliberately uses SQL files instead of an ORM migration tool while
PostgreSQL is being learned.

If your database already exists, do not recreate it or rerun old migrations.
Back it up and apply only migrations that have not already succeeded. If you
still need migration 003, apply it and its permissions command before the
ownership upgrade below. Keep `DATABASE_URL` connected as `applyr_app`, not
`postgres`.

### Upgrade existing records to per-user ownership

Use these steps when migrations 001–003 have already succeeded. Do not run the
fresh setup commands again.

1. Stop the API to prevent writes during the upgrade.
2. Make a private backup as `postgres`. Replace the output path with an existing
   directory outside the repository and choose a new filename:

   ```bash
   pg_dump -h localhost -p 5432 -U postgres -d job_tracker -Fc -f "/absolute/private/path/job_tracker-before-ownership-YYYYMMDD-HHMM.dump"
   pg_restore --list "/absolute/private/path/job_tracker-before-ownership-YYYYMMDD-HHMM.dump"
   ```

   Continue only if the dump succeeds and its archive listing can be read. This
   checks the archive, not a full restore. Backups include private application
   data, session records, and OAuth credentials; never commit or share them.
   After migration 004, full backups must still use an administrator that can
   bypass row-level security. Do not add `--enable-row-security`: it can produce
   only the rows visible to the backup user. See [PostgreSQL's pg_dump guide](https://www.postgresql.org/docs/18/app-pgdump.html).
3. Find the account that should own the existing records:

   ```bash
   psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -c "SELECT id, name, email FROM public.auth_users ORDER BY created_at;"
   ```

   Explicitly confirm the owner; do not choose the first account automatically.
   That account must already exist after a successful Google sign-in. Migration
   004 assigns all existing companies and applications to this one owner and
   preserves their IDs and events. If existing records belong to different
   people, stop and plan their assignments before running this migration.
4. Replace `CONFIRMED_USER_ID` with that account's exact `id`, then run both
   options in the same `psql` command so they share one database connection:

   ```bash
   psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -c "SET applyr.legacy_owner_id = 'CONFIRMED_USER_ID';" -f apps/server/database/migrations/004_user_owned_applications.sql
   ```

   If records exist but the owner is missing or does not exist in `auth_users`,
   the migration fails and its transaction rolls back. A lock timeout also
   rolls it back; close other open transactions before retrying. Do not rerun it
   after `COMMIT` succeeds.
5. Verify the runtime role cannot bypass the ownership policies:

   ```bash
   psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -c "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'applyr_app';"
   ```

   Both flags must be `f`. If necessary, correct them as the administrator:

   ```bash
   psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -c "ALTER ROLE applyr_app NOSUPERUSER NOBYPASSRLS;"
   ```

Migration 004 modifies existing business tables, so their existing grants still
apply; it needs no new table grants. Restart the API only after the migration
succeeds, then run the two-account checks below.

## 4. Configure the server

Copy the environment example:

```bash
cp apps/server/.env.example apps/server/.env
```

PowerShell equivalent:

```powershell
Copy-Item apps/server/.env.example apps/server/.env
```

Then replace `YOUR_PASSWORD` in `apps/server/.env`:

```dotenv
DATABASE_URL=postgresql://applyr_app:YOUR_PASSWORD@localhost:5432/job_tracker
PORT=3000
```

`DATABASE_URL` is read only by the server. Keep `PORT=3000` during local
development because Vite proxies `/api` requests to that port. The real `.env`
file is ignored by Git and must never be committed.

Verify the connection:

```bash
npm run db:check
```

### Configure local Google authentication

The server uses Better Auth with Google and requires the following configuration
at startup. The separate `db:check` command still needs only the database settings.
Keep this setup local. Production OAuth, hosting configuration, and shared rate
limiting still need their deployment checkpoint.

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. In **Google Auth platform**, configure **Branding** and choose an **External**
   audience. Keep local development credentials separate from production setup.
3. Under **Data Access**, select only the basic sign-in scopes: `openid`,
   `userinfo.email`, and `userinfo.profile`. Do not request Gmail or Drive access.
4. Under **Clients**, create a **Web application** OAuth client. Add the exact
   authorized redirect URI `http://localhost:3000/api/auth/callback/google`.
5. Add the following to your existing `apps/server/.env`. Preserve its database
   URL and replace the empty values with your real credentials:

```dotenv
BETTER_AUTH_URL=http://localhost:3000
WEB_ORIGIN=http://localhost:5173
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Generate `BETTER_AUTH_SECRET` in your own terminal and copy the output into
`.env`. It is a separate secret from the Google client secret:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Check the configuration from the repository root:

```bash
npm run auth:check -w @applyr/server
```

This command builds the server and validates the settings with Zod. It does not
contact Google, prove the credentials are genuine, or enable sign-in. Empty
credentials, a secret shorter than 32 characters, and invalid origins fail the
check. The running auth module imports these validated settings. Never put
secrets in `VITE_` variables, commit `.env`, or share its
contents. Any old `API_MODE` setting is unused and can be removed from `.env`.

See [Google's consent setup](https://developers.google.com/workspace/guides/configure-oauth-consent)
and [Better Auth's Google guide](https://better-auth.com/docs/authentication/google).

### How backend authentication works

1. The frontend starts Google sign-in through `/api/auth/sign-in/social`.
   Better Auth handles the Google callback and creates a database-backed session.
2. The browser sends its HttpOnly session cookie with later `/api` requests.
   The existing Vite proxy forwards these requests to Express locally.
3. `requireAuth` verifies the session and attaches it to `req.authSession`.
   Missing, expired, or revoked sessions return `401`.
4. Before a write, `requireTrustedOrigin` checks the request's `Origin` against
   `WEB_ORIGIN` and `BETTER_AUTH_URL`. Missing or untrusted origins return `403`.

Better Auth manages `auth_users`, `auth_accounts`, `auth_sessions`, and
`auth_verifications`. Application repositories still use raw SQL through `pg`.
The auth handler is registered before `express.json()` so it can read and
validate its own request body.

### How per-user ownership works

- Controllers read the user ID from the verified `req.authSession`, never from
  a form field, URL parameter, or request body. Services pass it to repositories.
- Application reads, writes, and dashboard counts use parameterized SQL owner
  filters. Another user's application ID returns the same `404` as a missing
  application, including when adding an event.
- `apps/server/src/db/with-user-transaction.ts` checks out one `pg` client,
  begins a transaction, and sets `applyr.user_id` with `set_config(..., true)`.
  The `true` makes this identity transaction-local: it ends at commit or
  rollback instead of remaining on a pooled connection for the next user.
  The helper always releases the client and discards it if rollback fails.
- PostgreSQL row-level security (RLS) adds a database check on companies,
  applications, and events. Without a matching transaction-local identity, the
  runtime role cannot read or write their rows. Better Auth's tables are separate
  because session verification must work before a user identity is established.
- Companies have an owner too. Their normalized names are unique per user, so
  two users can independently track the same company without sharing its website
  or company record. The composite foreign key `(user_id, company_id)` prevents
  an application from referring to another user's company.
- Events inherit ownership through their parent application rather than storing
  a duplicate user ID. Account deletion is not implemented; the owner foreign
  keys use `ON DELETE RESTRICT` to prevent accidental deletion of an account
  that still owns business records.

The trusted server supplies the database identity; RLS is defense in depth, not
a substitute for session verification. Never run the API as `postgres`, a
superuser, or a role with `BYPASSRLS`. See [PostgreSQL's row security guide](https://www.postgresql.org/docs/18/ddl-rowsecurity.html).

## 5. Run Applyr

Start the API in one terminal:

```bash
npm run dev:server
```

Start React in another terminal:

```bash
npm run dev:web
```

Open `http://localhost:5173`. The API health endpoint is available at
`http://localhost:3000/api/health`.

While signed out, application and dashboard pages redirect to `/sign-in`.
Choose **Continue with Google** to sign in. The header shows your name, email,
and a **Sign out** button once your session is loaded.

Use `localhost:5173` for the frontend, not `127.0.0.1` or Vite's next available
port. It must match `WEB_ORIGIN`. Google's registered callback still points to
Express on port 3000; Better Auth then returns you to the frontend on port 5173.

### How frontend authentication works

- `features/auth/api/auth-client.ts` creates one shared Better Auth React client.
  It calls same-origin `/api/auth` URLs through Vite's proxy. No frontend auth
  secrets, manual session storage, or extra context provider are needed.
- `RequireSession` waits for the session before rendering protected pages. A
  missing session redirects to sign-in; a failed session check offers Retry.
  Better Auth also rechecks sessions on window focus and shares sign-out across
  tabs. The Express session guard remains the actual security boundary.
- The sign-in URL remembers the requested page, including filters, in `returnTo`.
  A frontend-only Zod schema accepts only local dashboard/application paths.
  It rejects external destinations and sign-in loops, falling back to `/`.
- `GoogleSignInButton` gives Better Auth explicit frontend success/error return
  URLs. Better Auth handles the Google redirect and callback; Applyr never asks
  for your Google password. The button uses Google's
  [official G icon and branding guidance](https://developers.google.com/identity/branding-guidelines).
- After confirmed sign-out, a full-page `location.replace('/sign-in')` clears
  in-memory application state and replaces the current history entry. It does
  not erase all browser history; the session guard blocks older protected pages.

Client usage follows [Better Auth's React client documentation](https://better-auth.com/docs/concepts/client).

## Verification

Run TypeScript checks, linting, and production builds:

```bash
npm run verify
```

Useful individual commands:

```bash
npm run typecheck
npm run lint
npm run build
```

### Manual backend auth checks

With the API running, these checks require no Google login:

```bash
curl -i http://localhost:3000/api/health
curl -i http://localhost:3000/api/auth/ok
curl -i http://localhost:3000/api/auth/get-session
curl -i http://localhost:3000/api/applications
curl -i http://localhost:3000/api/dashboard
```

Expected statuses, in order: `200`, `200`, `200` with a `null` session, `401`,
and `401`. The protected endpoints should return the shared `UNAUTHORIZED`
error while signed out. These checks do not complete a real Google login;
verify that separately in the browser using the steps below.

Command-line clients must send an allowed `Origin` header for auth writes and
authenticated application writes, for example `Origin: http://localhost:5173`.

### Manual Google sign-in check

1. With both servers running, open
   `http://localhost:5173/applications?status=Interview` while signed out.
   You should see sign-in, not application records.
2. Choose **Continue with Google** and finish Google's sign-in screen yourself.
   You should return to Applications with the Interview filter preserved, and
   your name/email should appear in the header.
3. Refresh the page. Your session should survive the refresh.
4. Open Applyr in another tab. Sign out in the first tab, then return to the
   second. Both tabs should show sign-in; refreshing or using Back must not
   reveal a protected page while signed out.
5. Cancel Google consent, if Google presents it. You should return to sign-in
   with a useful message and be able to retry.
6. Stop the API and refresh Applyr. Expect a session-check error with Retry, not
   a false "signed out" result. Restart the API and choose Retry.

`redirect_uri_mismatch` means Google's registered callback does not exactly
match `http://localhost:3000/api/auth/callback/google`. An origin error means
the frontend URL does not match `WEB_ORIGIN`. If Google keeps the app in Testing,
use an allowed test account. Do not share passwords, session cookies, or `.env`
when reporting an error.

These checks are local only. Also verify record ownership with two accounts.

### Manual two-account isolation check

Use two separate browser profiles (or a normal and private window) so each has
its own Google session. Both accounts must be allowed by Google's current OAuth
audience settings. Use temporary test records, not applications you need to keep.

1. Sign in as account A. Create an application for `Ownership test company` with
   website `https://example.com/a`, add an event, and note its application ID.
2. Sign in as account B in the other browser. A's application and event must not
   appear in B's list or dashboard. Create the same company name with website
   `https://example.com/b`. Both records must retain their own website and have
   different company IDs in the application API responses.
3. In B's browser, open A's details URL. Expect "Application not found". Also
   test the API directly; hiding a link is not an authorization check. In the
   developer console on `http://localhost:5173`, replace `123` below with A's
   temporary application ID and run:

   ```javascript
   const foreignId = 123;
   const applicationInput = {
     company: { name: "Must not be created", website: null },
     role: "Ownership check",
     jobPostLink: null,
     status: "Applied",
     dateApplied: "2026-09-06",
     notes: null,
   };
   const requests = [
     ["GET", `/api/applications/${foreignId}`],
     ["PUT", `/api/applications/${foreignId}`, applicationInput],
     ["POST", `/api/applications/${foreignId}/events`, {
       eventType: "Follow-up", eventDate: "2026-09-06",
     }],
     ["DELETE", `/api/applications/${foreignId}`],
   ];
   for (const [method, path, body] of requests) {
     const response = await fetch(path, {
       method,
       credentials: "same-origin",
       ...(body === undefined ? {} : {
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(body),
       }),
     });
     console.log(method, response.status);
   }
   ```

   Every request must return `404`, not `400` or `403`. The valid test bodies
   ensure validation does not hide an ownership bug. The browser supplies its
   own session cookie and write-request `Origin`; do not copy or share cookies.
4. Refresh account A. Its application, company website, and event must be
   unchanged. Repeat in the other direction using B's temporary application ID.
5. Edit the status of B's own application and add an event successfully. Only B's
   dashboard counts and details should change. Delete each account's own test
   application and confirm the other account is unaffected.

### Manual MVP smoke test

Run these steps after signing in:

1. Open the dashboard and confirm all counts load.
2. Create an application and confirm it appears in the list.
3. Filter it by company, status, and date.
4. Open its details and add an event.
5. Edit its status and confirm the dashboard count changes.
6. Delete it and confirm it disappears.
7. Visit an unknown route and confirm the not-found page offers navigation.

## API routes

| Method   | Route                                     | Success                                |
| -------- | ----------------------------------------- | -------------------------------------- |
| `GET`    | `/api/health`                             | `200` health response                  |
| `GET`    | `/api/auth/ok`                            | `200` auth health response             |
| `GET`    | `/api/auth/get-session`                   | `200` session or `null`                |
| `POST`   | `/api/auth/sign-in/social`                | Google sign-in redirect information    |
| `GET`    | `/api/auth/callback/google`               | Google callback handled by Better Auth |
| `POST`   | `/api/auth/sign-out`                      | `200` session revoked                  |
| `GET`    | `/api/dashboard`                          | `200` application summary              |
| `GET`    | `/api/applications`                       | `200` application list                 |
| `POST`   | `/api/applications`                       | `201` created application              |
| `GET`    | `/api/applications/:applicationId`        | `200` application details              |
| `PUT`    | `/api/applications/:applicationId`        | `200` updated application              |
| `DELETE` | `/api/applications/:applicationId`        | `204` with no response body            |
| `POST`   | `/api/applications/:applicationId/events` | `201` created event                    |

Application and dashboard routes require a verified session; missing or invalid
sessions return `401`. Writes must also supply an `Origin` matching
`WEB_ORIGIN` or `BETTER_AUTH_URL`; missing/untrusted origins return `403`.
Invalid application request data returns the shared JSON error response with
status `400`. Missing applications, applications owned by someone else, or
unknown routes return `404`, and unexpected server failures return `500`.
Better Auth owns its `/api/auth/*` response formats.

## Deployment note

The current repository runs Vite and Express separately; Express does not serve
the built React application. A production deployment must provide Express with
`DATABASE_URL`, route browser requests under `/api/*` to Express, and make
non-file frontend routes fall back to `index.html`. All auth environment variables
must also be configured with production values. Before public release, repeat
the two-account ownership checks in the deployed environment and finish
production OAuth setup and proxy-aware shared rate limiting. The current auth
rate limiter uses in-process
memory, which is appropriate for local checks, not a shared serverless limit.
