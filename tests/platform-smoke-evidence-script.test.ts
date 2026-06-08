import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("platform smoke evidence script", () => {
  it("collects read-only aggregate evidence without printing private music data", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const source = readFileSync(
      join(process.cwd(), "src/worker/platform-smoke-evidence.ts"),
      "utf8"
    );
    const smokeDoc = readFileSync(
      join(process.cwd(), "docs/PLATFORM_FIRST_SMOKE_EVIDENCE.md"),
      "utf8"
    );
    const runbook = readFileSync(join(process.cwd(), "docs/PRODUCTION_SMOKE_TEST.md"), "utf8");

    expect(pkg.scripts["smoke:evidence"]).toBe(
      "tsx src/worker/platform-smoke-evidence.ts"
    );
    expect(source).toContain("SMOKE_USER_EMAIL");
    expect(source).toContain("maskEmail");
    expect(source).toContain("playlist_generations");
    expect(source).toContain("playlist_exports");
    expect(source).toContain("duplicate_new_music_queues");
    expect(source).toContain("recipe_snapshot @>");
    expect(source).toContain("where lower(email) = $1");
    expect(source).not.toMatch(/\.(insert|update|delete)\(/);
    expect(source).not.toMatch(/\binsert\s+into\b/i);
    expect(source).not.toMatch(/\bupdate\s+public\./i);
    expect(source).not.toMatch(/\bdelete\s+from\b/i);
    expect(source).not.toContain("encrypted_user_token");
    expect(source).not.toContain("payload");
    expect(source).not.toContain("artist_name");
    expect(source).not.toContain("playlist_note");
    expect(source).not.toContain("APPLE_PRIVATE_KEY");
    expect(source).not.toContain("musicUserToken");
    expect(smokeDoc).toContain("npm run smoke:evidence");
    expect(smokeDoc).toContain("does not print track names");
    expect(runbook).toContain("npm run smoke:evidence");
    expect(runbook).toContain("read-only");
  });
});
