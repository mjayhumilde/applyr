# Applyr

Applyr is a full-stack job application tracker. It keeps companies, job
applications, application statuses, and important events in one place instead of a
spreadsheet.

## MVP features

- Sign in with Google and sign out through database-backed sessions.
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
psql -U postgres -d postgres -c "CREATE ROLE applyr_app WITH LOGIN PASSWORD 'CHOOSE_A_LOCAL_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE;"
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
psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -c "GRANT USAGE ON SCHEMA public TO applyr_app; GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies, public.applications, public.application_events, public.auth_users, public.auth_sessions, public.auth_accounts, public.auth_verifications TO applyr_app; GRANT USAGE ON SEQUENCE public.companies_id_seq, public.applications_id_seq, public.application_events_id_seq TO applyr_app;"
```

These migrations are sequential and one-way. They are intended for a fresh
database and are not safe to rerun after they succeed. The project deliberately
uses SQL files instead of an ORM migration tool while PostgreSQL is being
learned.

If your database already exists, do not recreate it or rerun old migrations.
Back it up, apply only the new migration, and grant access to its new tables.
For the authentication upgrade, run only migration 003 from the commands above,
then the permissions command. Keep `DATABASE_URL` connected as `applyr_app`, not
`postgres`. If the migration commits but the permissions command fails, fix and
rerun only the permissions command; do not rerun the migration.

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
Per-user ownership is still a separate checkpoint; do not deploy this backend
publicly until ownership isolation is finished.

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

Authentication identifies the signed-in user. Per-user application ownership
is not implemented yet, so signed-in users would still access the same records.

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

These checks are local only. Sign-in does not yet isolate users' job records.

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
status `400`. Missing applications or routes return `404`, and unexpected server
failures return `500`. Better Auth owns its `/api/auth/*` response formats.

## Deployment note

The current repository runs Vite and Express separately; Express does not serve
the built React application. A production deployment must provide Express with
`DATABASE_URL`, route browser requests under `/api/*` to Express, and make
non-file frontend routes fall back to `index.html`. All auth environment variables
must also be configured with production values. Before public release, finish
per-user ownership checks, production OAuth setup, and
proxy-aware shared rate limiting. The current auth rate limiter uses in-process
memory, which is appropriate for local checks, not a shared serverless limit.
