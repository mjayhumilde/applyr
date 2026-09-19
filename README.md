# Applyr

Applyr is a full-stack job application tracker. It keeps companies, job
applications, application statuses, and important events in one place instead of a
spreadsheet.

## MVP features

- Sign in with Google and sign out through database-backed sessions.
- Keep each user's applications, companies, events, and dashboard counts private.
- Create, view, edit, and delete job applications.
- Save jobs to apply to later with `Saved`, then track them through `Applied`,
  `Interview`, `Offer`, and `Rejected`.
- Add dated events such as interviews and follow-ups.
- Filter applications by company, status, or application date.
- View submitted application totals and separate `Saved` counts on the dashboard.
- Attach the resume used for each application: upload, preview, download the
  original, replace, or remove a private PDF/DOCX (up to 4 MiB).

## Technology

- React, React Router, TypeScript, Tailwind CSS, and Vite
- Node.js, Express, TypeScript, and Zod
- Better Auth for Google sign-in and session management
- PostgreSQL through raw parameterized SQL with `pg`
- Private Vercel Blob for resume files; PostgreSQL stores ownership and metadata
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
psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -f apps/server/database/migrations/005_auth_rate_limits.sql
psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -f apps/server/database/migrations/006_saved_applications.sql
psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -f apps/server/database/migrations/007_application_resumes.sql
psql -h localhost -p 5432 -U postgres -d job_tracker -v ON_ERROR_STOP=1 -c "GRANT USAGE ON SCHEMA public TO applyr_app; GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies, public.applications, public.application_events, public.auth_users, public.auth_sessions, public.auth_accounts, public.auth_verifications, public.auth_rate_limits TO applyr_app; GRANT USAGE ON SEQUENCE public.companies_id_seq, public.applications_id_seq, public.application_events_id_seq TO applyr_app;"
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

### Add Saved status to an existing database

If migrations 001 through 005 have already succeeded, back up the database and
apply **only** `apps/server/database/migrations/006_saved_applications.sql` once
as the schema owner. In Neon, select the intended branch and database in SQL
Editor, paste that file's complete contents, and run it. Do not recreate tables
or rerun the earlier migrations.

Migration 006 preserves existing records and ownership policies. It allows a
null application date only for `Saved`; every other status still needs a date.
Its lock timeout safely aborts the transaction if the table is busy; retry the
complete migration later only if the previous attempt did not succeed.

For deployment, apply 006 first, then deploy the updated server, then the updated
web app. Do not create Saved records until both deployments are ready, and
refresh open browser tabs. Older clients do not understand `Saved` or null dates.
Once Saved records exist, rolling back to the old app requires a separate data
compatibility plan; do not restore the old NOT NULL constraint over saved jobs.

To use the feature, choose **Add application**, fill in the company and role,
optionally keep the job link, and select **Saved**. No application date is needed.
Later, edit it to **Applied** and enter the actual date. Saved jobs appear first
in date sorts and can be found with the Saved status filter. An application-date
filter only matches jobs that have been applied to. Dashboard totals exclude
Saved jobs, which have their own count.

### Add resumes to an existing database

If migrations 001 through 006 already succeeded, back up the database and apply
**only** `apps/server/database/migrations/007_application_resumes.sql` once as
the schema owner. In Neon, confirm the intended branch and database, then run
that file's complete contents in SQL Editor. This implementation does not apply
the migration automatically or change your production database.

Migration 007 adds the resume metadata/lifecycle table, enables and forces
row-level security, and grants the existing `applyr_app` role access. It does not
store file bytes in PostgreSQL or modify existing applications. A partial unique
index allows only one current resume per application. Deleting an application
retains its file-tracking row until the private object can be cleaned up.

Apply 007 and configure private storage before deploying the server, then deploy
the web app. Both deployments still need the existing matching proxy secret.

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

### Configure private resume storage

1. In Vercel, create a **private** Blob store and connect it to **applyr-server**
   for Production. Do not use a public store or attach production storage to
   the web project or Preview environments.
2. Set the server project's `BLOB_STORE_ID` to the store ID. On Vercel the SDK
   uses the automatically supplied OIDC token. If using token authentication
   instead, set the store's `BLOB_READ_WRITE_TOKEN` on the server project only.
   Do not set both methods to different stores.
3. For local development, create a separate private development store and put
   **its** `BLOB_READ_WRITE_TOKEN` in `apps/server/.env`. Never point routine
   development or tests at the production store. Keep the unused setting blank.
4. Restart the local API, or redeploy the server after saving Vercel variables.

See Vercel's [private storage guide](https://vercel.com/docs/vercel-blob/private-storage)
and [SDK authentication guide](https://vercel.com/docs/vercel-blob/using-blob-sdk).
Never paste tokens into React code, `VITE_` variables, screenshots, or commits.
The app can start without Blob credentials; resume upload/download then return
a clear storage-not-configured error. Migration 007 is still required.

Open an application's details and use **Resume used** after saving the
application. Choose a PDF or DOCX and select Upload resume. View resume opens an
authenticated full-screen preview with Download original and Close controls.
Close returns to the application without losing your place. Escape also closes
the preview, except when the browser's built-in PDF viewer captures that key;
use Close in that case.
Download original retrieves the exact uploaded bytes.
Replacing a resume requires confirmation and keeps the old one current until
the new upload is validated, stored, and committed. This is not version history:
the previous file is scheduled for deletion after replacement.

Limits and trade-offs:

- 4 MiB per file, below the platform's server-upload request limit. See
  [Vercel server uploads](https://vercel.com/docs/vercel-blob/server-upload).
- 50 MiB of tracked files per user and 20 upload attempts per rolling hour,
  enforced in PostgreSQL across server instances. Pending/cleanup files also
  consume quota; a replacement temporarily needs room for both files.
- Original filenames are metadata only. Blob keys are random, and every
  metadata, preview, download, and write request checks application ownership.
  Private object URLs and storage credentials are never sent to the browser.
- PDF preview uses the browser viewer. DOCX preview is loaded on demand in a
  scriptless, network-restricted frame; formatting can differ from Word.
  Download the original for the exact layout. No Google/Microsoft viewer is used.
- The server screens signatures and DOCX structure, decompression size, macros,
  embedded programs, and external resource relationships. This is **not an
  antivirus scanner** or a guarantee that an original document is harmless.
- Blob usage has separate storage/transfer limits. These per-user application
  limits do not guarantee the project stays within its hosting plan's allowance.

File deletion is tracked and retried, not a cross-service database transaction.
Uploads, removals, and application deletion attempt a bounded cleanup batch.
Abandoned pending uploads become eligible after one hour. If there is no later
activity, an operator must run cleanup; there is no scheduled cleanup job yet.
From a private shell with the intended database and Blob configuration, this
Git Bash sequence prompts for one exact `auth_users.id` (not an email):

```bash
read -r -p "User ID to clean up: " applyr_cleanup_user_id
npm run resumes:cleanup --workspace=@applyr/server -- "$applyr_cleanup_user_id"
unset applyr_cleanup_user_id
```

The command processes at most four tracked objects for that owner. Repeat until
`deletedCount` and `failedCount` are both zero. If failures persist, check storage
configuration before retrying. Do not manually delete tracking rows: they are
needed to find orphaned objects. After pending uploads expire, run another batch.

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

From the repository root, start the API in one terminal:

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

### If the API exits immediately

If the terminal shows both of these messages, the file watcher is still running,
but the API process has exited:

```text
server running on http://localhost:3000
Completed running 'src/server.ts'. Waiting for file changes before restarting...
```

One possible cause is another project, such as a Next.js app, already using port 3000. On Windows, check for a listener in PowerShell:

```powershell
netstat -ano -p tcp | Select-String ':3000\s'
```

Look for a `LISTENING` row with local port `3000`; the last column is its process
ID (PID). Use Task Manager's **Details** tab to help identify the process. Do not
stop all Node.js processes or stop a process you have not identified.

To resolve a confirmed port conflict:

1. Press `Ctrl+C` in the waiting Applyr server terminal.
2. Stop the competing app with `Ctrl+C` in its own terminal, or configure that
   app to use another port.
3. From the Applyr repository root, run `npm run dev:server` again.
4. Open `http://localhost:3000/api/health`. Expect JSON with `"status": "ok"`
   and a timestamp. This checks the API listener, not the database connection.

Keep Applyr on port 3000: Vite's API proxy, `BETTER_AUTH_URL`, and Google's local
callback are configured for it. Changing only `PORT` would leave those settings
pointing at the wrong server.

The current startup callback logs success without checking for a listen error.
[Express 5 passes listen errors to that callback](https://expressjs.com/en/guide/migrating-5/#app.listen),
so the startup message alone does not prove that Applyr owns the port. The steps
above resolve the port conflict; they do not change that logging behavior.

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
     [
       "POST",
       `/api/applications/${foreignId}/events`,
       {
         eventType: "Follow-up",
         eventDate: "2026-09-06",
       },
     ],
     ["DELETE", `/api/applications/${foreignId}`],
   ];
   for (const [method, path, body] of requests) {
     const response = await fetch(path, {
       method,
       credentials: "same-origin",
       ...(body === undefined
         ? {}
         : {
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
7. Save a job using `Saved` with no application date. Confirm it appears under the
   Saved filter and displays "Not applied yet" in its details. Its count should
   increase without changing Total applications.
8. Edit that saved job to `Applied`. A blank date must prevent submission. Add a
   date, save, and confirm the Saved count decreases and Total applications rises.
9. Visit an unknown route and confirm the not-found page offers navigation.
10. Attach a PDF to an application; preview it and download the original. Repeat
    with DOCX, including a filename with spaces. Refresh and confirm it persists.
11. Try an unsupported, empty, or over-4-MiB file. Then replace a valid resume,
    cancel a removal, and confirm a removal. An unsuccessful replacement must
    leave the existing attachment usable.
12. In account B, request account A's `/resume` and `/resume/file` endpoints and
    try upload/removal: all must return `404`. Signed-out requests return `401`.
    Delete a temporary application with a resume and verify private storage
    cleanup. Test with a development database/store before the production check.

## API routes

| Method   | Route                                          | Success                                |
| -------- | ---------------------------------------------- | -------------------------------------- |
| `GET`    | `/api/health`                                  | `200` health response                  |
| `GET`    | `/api/auth/ok`                                 | `200` auth health response             |
| `GET`    | `/api/auth/get-session`                        | `200` session or `null`                |
| `POST`   | `/api/auth/sign-in/social`                     | Google sign-in redirect information    |
| `GET`    | `/api/auth/callback/google`                    | Google callback handled by Better Auth |
| `POST`   | `/api/auth/sign-out`                           | `200` session revoked                  |
| `GET`    | `/api/dashboard`                               | `200` application summary              |
| `GET`    | `/api/applications`                            | `200` application list                 |
| `POST`   | `/api/applications`                            | `201` created application              |
| `GET`    | `/api/applications/:applicationId`             | `200` application details              |
| `PUT`    | `/api/applications/:applicationId`             | `200` updated application              |
| `DELETE` | `/api/applications/:applicationId`             | `204` with no response body            |
| `POST`   | `/api/applications/:applicationId/events`      | `201` created event                    |
| `GET`    | `/api/applications/:applicationId/resume`      | `200` metadata or `null`               |
| `PUT`    | `/api/applications/:applicationId/resume`      | `200` uploaded/replaced metadata       |
| `GET`    | `/api/applications/:applicationId/resume/file` | `200` original file bytes              |
| `DELETE` | `/api/applications/:applicationId/resume`      | `204` attachment removed               |

Resume uploads use a raw binary body with the canonical PDF/DOCX `Content-Type`
and a percent-encoded `X-Resume-Filename` header, not JSON or multipart form data.
The authenticated raw-body parser is limited to 4 MiB; other JSON API limits are
unchanged. File requests may include `download=1` and `resumeId=<metadata UUID>`;
a replaced version returns `409` instead of downloading bytes under a stale
filename. Size/quota violations return `413` and upload rate limits return `429`.

Application and dashboard routes require a verified session; missing or invalid
sessions return `401`. Writes must also supply an `Origin` matching
`WEB_ORIGIN` or `BETTER_AUTH_URL`; missing/untrusted origins return `403`.
Invalid application request data returns the shared JSON error response with
status `400`. Missing applications, applications owned by someone else, or
unknown routes return `404`, and unexpected server failures return `500`.
Better Auth owns its `/api/auth/*` response formats.

## Production preparation (Checkpoint 6)

The deployment uses two Vercel projects from this repository: `apps/web` and
`apps/server`, with PostgreSQL on Neon. Express already exports its app from
`apps/server/src/app.ts`; `server.ts` starts the listener for local development.
This checkpoint prepares the code. It does not deploy projects, change Google
OAuth settings, or apply migrations to your existing databases.

### One public origin for the browser

```text
Browser: https://<web-domain>/api/...
  -> web routing middleware: attach trusted visitor IP and proxy secret
  -> web rewrite: forward /api/... to https://<backend-domain>/api/...
  -> Express: verify proxy secret, then session/origin/ownership checks
  -> Neon: restricted runtime role and user-scoped transactions
```

`apps/web/vercel.json` forwards `/api/:path*` to
`https://applyr-server.vercel.app/api/:path*` before the React `index.html`
fallback. Explicit destinations avoid the deployment's missing-`destination`
validation error without depending on TypeScript configuration evaluation or
`API_ORIGIN`. The backend hostname is public configuration, not a secret; update
this file if the backend domain changes. Local Vite is unchanged and continues
forwarding `/api` to `http://localhost:3000`.

Configure these values in the Vercel dashboards for Production:

| Variable                                          | Web project                       | Server project                                                   |
| ------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| `PROXY_SHARED_SECRET`                             | Same new random secret            | Same new random secret                                           |
| `NODE_ENV`                                        | Vercel's production build default | `production`                                                     |
| `BETTER_AUTH_URL`                                 | Not needed                        | `https://<web-domain>`                                           |
| `WEB_ORIGIN`                                      | Not needed                        | `https://<web-domain>`                                           |
| `BETTER_AUTH_SECRET`                              | Not needed                        | Separate random secret                                           |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`       | Not needed                        | Production OAuth credentials                                     |
| `DATABASE_URL`                                    | Not needed                        | Restricted runtime login, Neon pooled URL, `sslmode=verify-full` |
| `DB_POOL_MAX`                                     | Not needed                        | `5` initially (allowed range: 2–20)                              |
| `BLOB_STORE_ID` (OIDC) or `BLOB_READ_WRITE_TOKEN` | Not needed                        | Private server-project resume store; see storage setup above     |

Generate the two secrets separately with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Never commit the output, use `VITE_` for these settings, or put them in React
code. The proxy secret belongs to deployment middleware and Express only. After
changing it, deploy both projects with the matching value; mismatches block API
access. The existing frontend deployment will need these settings before its API
proxy can work. `API_ORIGIN` is no longer used and can be removed from the web
project. Do not add the production proxy secret or database credentials to
Preview. Without the proxy secret, web middleware rejects preview API requests
with `503` before forwarding them. Isolated previews require both a separate
rewrite destination and isolated backend/database/secrets; preview environment
settings alone do not change the static destination.

Register this production Google redirect URI **on the web origin**:

```text
https://<web-domain>/api/auth/callback/google
```

Both server auth origins must match in production. Cookies remain host-only;
do not set a shared `.vercel.app` cookie domain or enable broad CORS. Google login
and callback requests travel through the same web-origin API proxy.

### Trusted IPs and shared authentication limits

`apps/web/middleware.ts` reads Vercel's visitor IP, validates it with Zod, and
overwrites the internal IP/secret request headers. Express checks the secret
before trusting the IP. Unauthenticated direct requests to the backend,
including its health endpoint, return `403`; use the **web-origin** health URL.
This secret protects the proxy boundary, not user identity: session, origin,
and per-user ownership checks still run separately.

Locally, Express uses the socket address and overwrites supplied IP headers.
Production uses Better Auth's atomic PostgreSQL counters in `auth_rate_limits`;
development uses memory. Separate instances therefore share the production
limit. Expired counters are pruned opportunistically when a bucket resets, not
by a scheduled TTL job. These limits cover Better Auth endpoints, not every
business API route. See [Better Auth rate limiting](https://better-auth.com/docs/concepts/rate-limit).

### Database readiness

Use Neon's **pooled** connection string for the runtime, with the restricted
`applyr_app` login and `sslmode=verify-full`. Use a separate schema-owner/direct
connection for migrations. Do not use `neondb_owner`, an administrative role,
or a member of `neon_superuser` in the deployed API. Do not disable TLS certificate
verification. The `pg` pool is shared within each instance, defaults to five
connections, waits at most ten seconds for a connection, and releases idle
connections after five seconds. Vercel's pool helper also releases idle
connections before instance suspension. The pool limit is **per instance**, not
a deployment-wide maximum. See [Vercel connection pooling](https://vercel.com/kb/guide/connection-pooling-with-functions).

For an existing database where 001–004 already succeeded, back it up and apply
005 once as its schema owner, without rerunning 001–004. Local PostgreSQL example:

```bash
psql -h localhost -p 5432 -U postgres -d job_tracker -X -v ON_ERROR_STOP=1 \
  -f apps/server/database/migrations/005_auth_rate_limits.sql \
  -c "GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_rate_limits TO applyr_app;"
```

After 005 succeeds, apply **006** using the
[Saved status upgrade](#add-saved-status-to-an-existing-database) instructions
before deploying the updated server and web app. If 005 already succeeded,
skip the command above and apply only 006. Then apply **007** using the
[resume upgrade](#add-resumes-to-an-existing-database) instructions. Skip any
migration that has already succeeded.

Use the full `psql.exe` path shown earlier if needed. For a fresh Neon database,
apply 001–007 in order and grant the table/sequence privileges listed in local
setup. If legacy records exist, follow the ownership migration instructions
first; never invent a legacy owner. Migration 005 needs no sequence grant and
does not change application records. Local development does not require 005
immediately because its limiter still uses memory.

Before deploying, run `npm run db:check` from a private shell configured with
the production `DATABASE_URL` and `NODE_ENV=production`. The check rejects
administrative runtime roles and table ownership, missing/unforced RLS, and a
missing rate-limit/resume tables or their CRUD grants. It does not create tables,
grant permissions, or replace the two-account isolation test. It does not yet check
the Saved constraints from 006; confirm that migration succeeded separately.

### Release gate (Checkpoint 7)

Run `npm run verify` and `npm run auth:check -w @applyr/server` with the intended
environment. Then deploy and check the real two-project behavior:

- Open `https://<web-domain>/api/health`; direct backend API access without the
  proxy secret should be rejected.
- Sign in with Google, refresh a protected page, and sign out. Confirm the
  callback uses the web domain, cookies are Secure/HttpOnly, and API responses
  have `Cache-Control: no-store`.
- Confirm two different clients get distinct trusted IPs through the deployed
  proxy, and forged incoming IP headers do not change the recorded identity.
  Never expose or log the proxy secret while checking.
- Repeat the two-account isolation checks above against the deployed database.
- Keep Google production publishing, deployment protection/access settings,
  actual Neon TLS connectivity, and the deployed cookie/IP round trip as
  explicit release checks; local tests cannot verify these platform settings.
