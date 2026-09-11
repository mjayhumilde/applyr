import { env } from "../config/env.js";
import { pool } from "./pool.js";

type ConnectionCheckRow = {
  database_name: string;
  user_name: string;
  server_time: Date;
};

type OwnedTableCheckRow = {
  table_name: string;
  rls_enabled: boolean;
  rls_forced: boolean;
  can_act_as_owner: boolean;
};

async function checkProductionDatabase(): Promise<void> {
  // Role attributes are not inherited, but SET ROLE can activate a privileged role.
  const privilegedRoles = await pool.query<{ role_name: string }>(`
    SELECT rolname AS role_name
    FROM pg_roles
    WHERE (
      rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb
      OR rolname = 'neon_superuser'
    )
      AND (rolname = current_user OR pg_has_role(current_user, oid, 'SET'));
  `);

  if (privilegedRoles.rows.length > 0) {
    const names = privilegedRoles.rows.map((role) => role.role_name).join(", ");
    throw new Error(
      `Production DATABASE_URL can use privileged role(s): ${names}. Use the restricted applyr_app login without administrative role memberships.`,
    );
  }

  const ownedTableNames = ["companies", "applications", "application_events"];
  const ownedTables = await pool.query<OwnedTableCheckRow>(
    `
      SELECT
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        c.relforcerowsecurity AS rls_forced,
        (
          pg_has_role(current_user, c.relowner, 'USAGE')
          OR pg_has_role(current_user, c.relowner, 'SET')
        ) AS can_act_as_owner
      FROM pg_class AS c
      JOIN pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p')
        AND c.relname = ANY($1::text[]);
    `,
    [ownedTableNames],
  );

  for (const name of ownedTableNames) {
    const table = ownedTables.rows.find((row) => row.table_name === name);

    if (!table || !table.rls_enabled || !table.rls_forced) {
      throw new Error(
        `public.${name} must exist with row-level security enabled and forced. Apply migrations 001 through 004 as the schema owner before deploying.`,
      );
    }

    if (table.can_act_as_owner) {
      throw new Error(
        `The production database login can act as the owner of public.${name}. Use a separate runtime role without ownership or membership in the table-owning role.`,
      );
    }
  }

  const rateLimit = await pool.query<{ has_required_privileges: boolean }>(`
    SELECT (
      has_schema_privilege(current_user, n.oid, 'USAGE')
      AND has_table_privilege(current_user, c.oid, 'SELECT')
      AND has_table_privilege(current_user, c.oid, 'INSERT')
      AND has_table_privilege(current_user, c.oid, 'UPDATE')
      AND has_table_privilege(current_user, c.oid, 'DELETE')
    ) AS has_required_privileges
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'auth_rate_limits'
      AND c.relkind IN ('r', 'p');
  `);

  if (!rateLimit.rows[0]?.has_required_privileges) {
    throw new Error(
      "Production authentication needs public.auth_rate_limits with SELECT, INSERT, UPDATE, and DELETE privileges. Apply migration 005 and its runtime grants; ensure the runtime role has USAGE on public.",
    );
  }

  // These catalog checks complement, not replace, the two-account isolation test.
  console.log(
    "Production database role, RLS flags, and rate-limit table checks passed",
  );
}

try {
  const result = await pool.query<ConnectionCheckRow>(`
    SELECT
      current_database() AS database_name,
      current_user AS user_name,
      NOW() AS server_time;
  `);

  const connection = result.rows[0];

  if (!connection) {
    throw new Error("Database connection check returned no rows");
  }

  if (env.NODE_ENV === "production") {
    await checkProductionDatabase();
  }

  console.log("Database connection successful");
  console.log(`Database: ${connection.database_name}`);
  console.log(`User: ${connection.user_name}`);
  console.log(`Server time: ${connection.server_time.toISOString()}`);
} catch (error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown database error";

  console.error(`Database connection failed: ${message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
