import { loadRuntimeEnv } from "@/lib/load-runtime-env";

loadRuntimeEnv();

async function bootstrap() {
  const [
    { env },
    { logger },
    { createPgBoss },
    { registerLibrarySyncWorker },
    { registerCreateApplePlaylistsWorker },
    { registerFullSortWorker }
  ] = await Promise.all([
    import("@/lib/env"),
    import("@/lib/logger"),
    import("@/lib/pg-boss"),
    import("@/worker/library-sync"),
    import("@/worker/jobs/create-apple-playlists"),
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
  await registerCreateApplePlaylistsWorker(boss);

  logger.info("Worker started and ready for library sync, full Sort, and playlist creation jobs.");
}

bootstrap().catch(async (error) => {
  const [{ logger }, { createPrivacySafeFailure }] = await Promise.all([
    import("@/lib/logger"),
    import("@/modules/activity/privacy-safe-observability")
  ]);

  const failure = createPrivacySafeFailure({
    workflowName: "Worker boot",
    error
  });

  logger.error(
    {
      eventType: "worker_boot_failed",
      failureCategory: failure.category
    },
    "Worker failed to boot."
  );
  process.exit(1);
});
