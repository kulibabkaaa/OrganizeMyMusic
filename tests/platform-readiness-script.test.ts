import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("platform readiness script", () => {
  it("checks platform schema, migrations, env, and worker queues without logging secrets", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const source = readFileSync(
      join(process.cwd(), "src/worker/platform-readiness.ts"),
      "utf8"
    );

    expect(pkg.scripts["platform:check"]).toBe("tsx src/worker/platform-readiness.ts");
    expect(source).toContain("platform_playlists");
    expect(source).toContain("fix_playlists_updated_at_default");
    expect(source).toContain("playlist_recipes_scope_check");
    expect(source).toContain("playlist-generation-export");
    expect(source).toContain("blockingJobStates");
    expect(source).toContain("no active, queued, retrying, or failed jobs");
    expect(source).toContain("encryption key strength");
    expect(source).toContain("getEncryptionKeyValidationError");
    expect(source).toContain("relrowsecurity");
    expect(source).toContain("missing:");
    expect(source).not.toContain("console.log(env");
    expect(source).not.toContain("APPLE_PRIVATE_KEY:");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY:");
  });
});
