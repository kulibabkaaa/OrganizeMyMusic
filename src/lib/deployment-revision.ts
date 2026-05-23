export type DeploymentProvider = "vercel" | "railway" | "generic" | "unknown";

export interface DeploymentRevision {
  provider: DeploymentProvider;
  environment: string;
  commitSha: string;
  branch: string;
  service: string;
}

type DeploymentEnv = Record<string, string | undefined>;

function firstDefined(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0) ?? "unknown";
}

export function getDeploymentRevision(env: DeploymentEnv = process.env): DeploymentRevision {
  if (env.RAILWAY_GIT_COMMIT_SHA || env.RAILWAY_ENVIRONMENT_NAME || env.RAILWAY_SERVICE_NAME) {
    return {
      provider: "railway",
      environment: firstDefined(env.RAILWAY_ENVIRONMENT_NAME, env.NODE_ENV),
      commitSha: firstDefined(env.RAILWAY_GIT_COMMIT_SHA),
      branch: firstDefined(env.RAILWAY_GIT_BRANCH),
      service: firstDefined(env.RAILWAY_SERVICE_NAME)
    };
  }

  if (env.VERCEL || env.VERCEL_GIT_COMMIT_SHA || env.VERCEL_ENV) {
    return {
      provider: "vercel",
      environment: firstDefined(env.VERCEL_ENV, env.NODE_ENV),
      commitSha: firstDefined(env.VERCEL_GIT_COMMIT_SHA),
      branch: firstDefined(env.VERCEL_GIT_COMMIT_REF),
      service: firstDefined(env.VERCEL_GIT_REPO_SLUG, env.VERCEL_PROJECT_PRODUCTION_URL)
    };
  }

  const genericCommit = firstDefined(
    env.GIT_COMMIT_SHA,
    env.COMMIT_SHA,
    env.SOURCE_VERSION,
    env.RENDER_GIT_COMMIT
  );

  if (genericCommit !== "unknown") {
    return {
      provider: "generic",
      environment: firstDefined(env.NODE_ENV),
      commitSha: genericCommit,
      branch: firstDefined(env.GIT_BRANCH, env.BRANCH),
      service: firstDefined(env.SERVICE_NAME, env.APP_NAME)
    };
  }

  return {
    provider: "unknown",
    environment: "unknown",
    commitSha: "unknown",
    branch: "unknown",
    service: "unknown"
  };
}
