import { Pool } from "pg";

import { env } from "@/lib/env";

let pool: Pool | null = null;

export function getPool() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to access Postgres.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10
    });
  }

  return pool;
}

