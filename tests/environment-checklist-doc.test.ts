import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");
const envDoc = readFileSync(join(process.cwd(), "docs/ENVIRONMENT_VARIABLES.md"), "utf8");
const workerDoc = readFileSync(join(process.cwd(), "docs/WORKER_DEPLOYMENT.md"), "utf8");

const publicVars = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
];

const serverOnlyVars = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "ENCRYPTION_KEY",
  "APPLE_TEAM_ID",
  "APPLE_KEY_ID",
  "APPLE_PRIVATE_KEY",
  "APPLE_MUSICKIT_KEY",
  "OPENAI_API_KEY",
  "AUTH_APPLE_OAUTH_ENABLED",
  "AUTH_GOOGLE_OAUTH_ENABLED",
  "PAYMENTS_ENABLED",
  "PAYMENTS_DEV_BYPASS_ENABLED",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_SORT",
  "SENTRY_DSN"
];

describe("production environment checklist docs", () => {
  it("keeps .env.example placeholder-only and dev bypass disabled by default", () => {
    expect(envExample).toContain("SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>");
    expect(envExample).toContain("OPENAI_API_KEY=<openai-api-key>");
    expect(envExample).toContain("PAYMENTS_DEV_BYPASS_ENABLED=false");
    expect(envExample).not.toContain("PAYMENTS_DEV_BYPASS_ENABLED=true");
    expect(envExample).not.toContain("sb_secret_");
    expect(envExample).not.toContain("Trololo");
    expect(envExample).not.toContain("-----BEGIN PRIVATE KEY-----\nM");
  });

  it("marks public and server-only variables explicitly", () => {
    for (const variable of publicVars) {
      expect(envDoc).toContain(variable);
      expect(envDoc).toContain("Only these variables may be exposed to browser code");
    }

    for (const variable of serverOnlyVars) {
      expect(envDoc).toContain(variable);
      expect(envDoc).toContain("These must never be exposed to browser code");
    }
  });

  it("documents production checks, rotation, and worker health checks", () => {
    expect(envDoc).toContain("Production Deploy Checklist");
    expect(envDoc).toContain("Rotation Notes");
    expect(envDoc).toContain("Never enable the development bypass in production.");
    expect(workerDoc).toContain("Production worker env checklist");
    expect(workerDoc).toContain("Health Check Steps");
    expect(workerDoc).toContain("npm run worker:check");
    expect(workerDoc).toContain("Worker deployment revision.");
  });
});
