import { getDeploymentRevision } from "@/lib/deployment-revision";
import { loadRuntimeEnv } from "@/lib/load-runtime-env";
import { logger } from "@/lib/logger";
import { createPrivacySafeFailure } from "@/modules/activity/privacy-safe-observability";

async function checkWorkerDatabase() {
  loadRuntimeEnv();
  const [{ env }, { createPgBoss }] = await Promise.all([
    import("@/lib/env"),
    import("@/lib/pg-boss")
  ]);

  logger.info({ revision: getDeploymentRevision() }, "Worker deployment revision.");

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for worker health check.");
  }

  const boss = createPgBoss();

  if (!boss) {
    throw new Error("Unable to create pg-boss instance.");
  }

  await boss.start();

  try {
    logger.info("Worker database health check passed.");
  } finally {
    await boss.stop();
  }
}

checkWorkerDatabase().catch((error) => {
  const failure = createPrivacySafeFailure({
    workflowName: "Worker health check",
    error
  });

  logger.error(
    {
      eventType: "worker_health_check_failed",
      failureCategory: failure.category
    },
    "Worker database health check failed."
  );
  process.exit(1);
});
