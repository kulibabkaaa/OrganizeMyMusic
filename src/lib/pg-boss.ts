import PgBoss from "pg-boss";

import { env } from "@/lib/env";

export function createPgBoss() {
  if (!env.DATABASE_URL) {
    return null;
  }

  return new PgBoss({
    connectionString: env.DATABASE_URL
  });
}

export async function withPgBoss<T>(callback: (boss: PgBoss) => Promise<T>) {
  const boss = createPgBoss();

  if (!boss) {
    return null;
  }

  await boss.start();

  try {
    return await callback(boss);
  } finally {
    await boss.stop();
  }
}
