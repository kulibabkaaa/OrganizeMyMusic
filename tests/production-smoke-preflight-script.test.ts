import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("production smoke preflight script", () => {
  it("checks production web, GitHub deployment statuses, and avoids Apple Music writes", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const source = readFileSync(
      join(process.cwd(), "src/worker/production-smoke-preflight.ts"),
      "utf8"
    );

    expect(pkg.scripts["smoke:preflight"]).toBe(
      "tsx src/worker/production-smoke-preflight.ts"
    );
    expect(source).toContain("/api/health");
    expect(source).toContain("Apple Music organization platform");
    expect(source).toContain("Sign in to continue.");
    expect(source).toContain("github deployment statuses");
    expect(source).toContain("Vercel");
    expect(source).toContain("Railway");
    expect(source).toContain("PRODUCTION_SMOKE_URL");
    expect(source).toContain("GITHUB_TOKEN");
    expect(source).not.toContain("/api/apple/connect");
    expect(source).not.toContain("/api/library-syncs");
    expect(source).not.toContain("musicUserToken");
    expect(source).not.toContain("APPLE_PRIVATE_KEY");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
