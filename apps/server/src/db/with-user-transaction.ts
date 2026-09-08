import type { PoolClient } from "pg";

import { pool } from "./pool.js";

export async function withUserTransaction<T>(
  userId: string,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let discardConnection = false;

  try {
    await client.query("BEGIN");
    // true makes the identity transaction-local, not persistent on a pooled connection.
    await client.query("SELECT set_config('applyr.user_id', $1, true)", [userId]);
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // A broken connection must not be returned to the pool for another user.
      discardConnection = true;
      throw new AggregateError(
        [error, rollbackError],
        "User transaction rollback failed",
      );
    }
    throw error;
  } finally {
    client.release(discardConnection);
  }
}
