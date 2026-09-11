import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { env } from "../config/env.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 5_000,
});

// Vercel can suspend an instance; release its idle connections before suspension.
if (env.VERCEL === "1") {
  attachDatabasePool(pool);
}

pool.on("error", () => {
  console.error("An idle database connection failed; the pool will replace it");
});
