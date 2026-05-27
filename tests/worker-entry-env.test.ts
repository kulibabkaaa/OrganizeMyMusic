import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("worker entry env loading", () => {
  it("loads Next-style env files before importing env-dependent worker modules", () => {
    const source = readFileSync(join(process.cwd(), "src/worker/index.ts"), "utf8");
    const loadIndex = source.indexOf("loadRuntimeEnv();");
    const envImportIndex = source.indexOf('import("@/lib/env")');

    expect(loadIndex).toBeGreaterThanOrEqual(0);
    expect(envImportIndex).toBeGreaterThan(loadIndex);
    expect(source).not.toContain('import { env } from "@/lib/env";');
    expect(source).not.toContain('import { createPgBoss } from "@/lib/pg-boss";');
  });
});
