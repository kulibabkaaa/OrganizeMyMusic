import { loadRuntimeEnv } from "@/lib/load-runtime-env";

loadRuntimeEnv();

async function checkWorkerDatabase() {
  const [{ env }, { getDeploymentRevision }, { logger }, { createPgBoss }] = await Promise.all([
    import("@/lib/env"),
    import("@/lib/deployment-revision"),
    import("@/lib/logger"),
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

checkWorkerDatabase().catch(async (error) => {
  const { logger } = await import("@/lib/logger");

  logger.error(error, "Worker database health check failed.");
  process.exit(1);
});
