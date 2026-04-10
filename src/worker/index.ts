import PgBoss from "pg-boss";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

async function bootstrap() {
  if (!env.DATABASE_URL) {
    logger.warn("DATABASE_URL missing, worker boot skipped.");
    return;
  }

  const boss = new PgBoss(env.DATABASE_URL);
  await boss.start();

  logger.info("Worker started and ready for sort pipeline jobs.");
}

bootstrap().catch((error) => {
  logger.error(error, "Worker failed to boot.");
  process.exit(1);
});

