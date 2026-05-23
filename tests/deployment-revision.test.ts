import { describe, expect, it } from "vitest";

import { getDeploymentRevision } from "@/lib/deployment-revision";

describe("getDeploymentRevision", () => {
  it("reports Vercel commit metadata without secrets", () => {
    expect(
      getDeploymentRevision({
        VERCEL: "1",
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_SHA: "abc123",
        VERCEL_GIT_COMMIT_REF: "main",
        VERCEL_GIT_REPO_SLUG: "OrganizeMyMusic",
        SUPABASE_SERVICE_ROLE_KEY: "secret"
      })
    ).toEqual({
      provider: "vercel",
      environment: "production",
      commitSha: "abc123",
      branch: "main",
      service: "OrganizeMyMusic"
    });
  });

  it("reports Railway commit metadata for worker verification", () => {
    expect(
      getDeploymentRevision({
        RAILWAY_ENVIRONMENT_NAME: "production",
        RAILWAY_GIT_COMMIT_SHA: "def456",
        RAILWAY_GIT_BRANCH: "main",
        RAILWAY_SERVICE_NAME: "OrganizeMyMusic"
      })
    ).toEqual({
      provider: "railway",
      environment: "production",
      commitSha: "def456",
      branch: "main",
      service: "OrganizeMyMusic"
    });
  });

  it("falls back when deployment metadata is unavailable", () => {
    expect(getDeploymentRevision({})).toEqual({
      provider: "unknown",
      environment: "unknown",
      commitSha: "unknown",
      branch: "unknown",
      service: "unknown"
    });
  });
});
