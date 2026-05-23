import { env } from "@/lib/env";
import { getDeploymentRevision } from "@/lib/deployment-revision";
import { logger } from "@/lib/logger";
import { createPgBoss } from "@/lib/pg-boss";

async function checkWorkerDatabase() {
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
  logger.error(error, "Worker database health check failed.");
  process.exit(1);
});
