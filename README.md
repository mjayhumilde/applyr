# Applyr

Applyr is a full-stack job application tracker. It keeps companies, job
applications, application statuses, and important events in one place instead of a
spreadsheet.

## MVP features

- Create, view, edit, and delete job applications.
- Track applications through `Applied`, `Interview`, `Offer`, and `Rejected`.
- Add dated events such as interviews and follow-ups.
- Filter applications by company, status, or application date.
- View total applications and status counts on the dashboard.

## Technology

- React, React Router, TypeScript, Tailwind CSS, and Vite
- Node.js, Express, TypeScript, and Zod
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

- Node.js `^20.19.0` or `>=22.12.0` (Node.js 22 or newer is recommended)
- npm
- PostgreSQL and the `psql` command-line client

The project was developed with Node.js 24 and PostgreSQL 18.

## 1. Install dependencies

From the repository root:

```bash
npm ci
```

## 2. Create the local database

For a fresh local setup, let the application role own its database. That role
can then create and access the tables without using the PostgreSQL superuser at
runtime.

Run these commands as the PostgreSQL administrator:

```bash
psql -U postgres -d postgres -c "CREATE ROLE applyr_app WITH LOGIN PASSWORD 'CHOOSE_A_LOCAL_PASSWORD';"
psql -U postgres -d postgres -c "CREATE DATABASE job_tracker OWNER applyr_app;"
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

Run each migration in numerical order while connected as `applyr_app`:

```bash
psql -h localhost -p 5432 -U applyr_app -d job_tracker -v ON_ERROR_STOP=1 -f apps/server/database/migrations/001_initial_schema.sql
psql -h localhost -p 5432 -U applyr_app -d job_tracker -v ON_ERROR_STOP=1 -f apps/server/database/migrations/002_unique_company_name.sql
```

These migrations are sequential and one-way. They are intended for a fresh
database and are not safe to rerun after they succeed. The project deliberately
uses SQL files instead of an ORM migration tool while PostgreSQL is being
learned.

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

## Verification

Run all TypeScript checks, linting, and production builds:

```bash
npm run verify
```

Useful individual commands:

```bash
npm run typecheck
npm run lint
npm run build
```

Manual MVP smoke test:

1. Open the dashboard and confirm all counts load.
2. Create an application and confirm it appears in the list.
3. Filter it by company, status, and date.
4. Open its details and add an event.
5. Edit its status and confirm the dashboard count changes.
6. Delete it and confirm it disappears.
7. Visit an unknown route and confirm the not-found page offers navigation.

## API routes

| Method | Route | Success |
| --- | --- | --- |
| `GET` | `/api/health` | `200` health response |
| `GET` | `/api/dashboard` | `200` application summary |
| `GET` | `/api/applications` | `200` application list |
| `POST` | `/api/applications` | `201` created application |
| `GET` | `/api/applications/:applicationId` | `200` application details |
| `PUT` | `/api/applications/:applicationId` | `200` updated application |
| `DELETE` | `/api/applications/:applicationId` | `204` with no response body |
| `POST` | `/api/applications/:applicationId/events` | `201` created event |

Invalid request data returns a shared JSON error response with status `400`.
Missing applications or routes return `404`, and unexpected server failures
return `500`.

## Deployment note

The current repository runs Vite and Express separately; Express does not serve
the built React application. A production deployment must provide Express with
`DATABASE_URL`, route browser requests under `/api/*` to Express, and make
non-file frontend routes fall back to `index.html`.
