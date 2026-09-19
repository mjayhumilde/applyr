import { z } from "zod";

import { pool } from "../../db/pool.js";
import { cleanupUserResumes } from "./resume.service.js";

// An explicit owner keeps the operational command within the same RLS boundary
// as API requests. Run another batch if more tracked objects remain.
try {
  const userId = z.string().trim().min(1).max(255).parse(process.argv[2]);
  const result = await cleanupUserResumes(userId);
  console.log("Resume cleanup batch finished", result);
  if (result.failedCount > 0) process.exitCode = 1;
} catch {
  console.error(
    "Resume cleanup failed. Supply an auth_users.id and check database/storage configuration.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
