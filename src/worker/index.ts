import { loadRuntimeEnv } from "@/lib/load-runtime-env";

loadRuntimeEnv();

async function bootstrap() {
  const [
    { env },
    { logger },
    { createPgBoss },
    { registerLibrarySyncWorker },
    { registerPlaylistCreationWorker },
    { registerFullSortWorker }
  ] = await Promise.all([
    import("@/lib/env"),
    import("@/lib/logger"),
    import("@/lib/pg-boss"),
    import("@/worker/library-sync"),
    import("@/worker/playlist-creation"),
    import("@/worker/jobs/full-sort")
  ]);

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
  await registerFullSortWorker(boss);
  await registerPlaylistCreationWorker(boss);

  logger.info("Worker started and ready for library sync, full Sort, and playlist creation jobs.");
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
