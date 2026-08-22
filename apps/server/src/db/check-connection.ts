import { pool } from "./pool.js";

type ConnectionCheckRow = {
  database_name: string;
  user_name: string;
  server_time: Date;
};

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
