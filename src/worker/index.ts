import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createPgBoss } from "@/lib/pg-boss";
import { registerLibrarySyncWorker } from "@/worker/library-sync";
import { registerPlaylistCreationWorker } from "@/worker/playlist-creation";

async function bootstrap() {
  if (!env.DATABASE_URL) {
    logger.warn("DATABASE_URL missing, worker boot skipped.");
    return;
  }

  const boss = createPgBoss();

  if (!boss) {
    logger.warn("DATABASE_URL missing, worker boot skipped.");
    return;
  }

  await boss.start();
  await registerLibrarySyncWorker(boss);
  await registerPlaylistCreationWorker(boss);

  logger.info("Worker started and ready for library sync and playlist creation jobs.");
}

bootstrap().catch((error) => {
  logger.error(error, "Worker failed to boot.");
  process.exit(1);
});
