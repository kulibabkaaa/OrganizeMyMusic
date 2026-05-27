import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadRuntimeEnv } from "@/lib/load-runtime-env";

describe("loadRuntimeEnv", () => {
  it("loads local Next-style env files for standalone worker commands", () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const dir = mkdtempSync(join(tmpdir(), "omm-env-"));
    delete process.env.DATABASE_URL;

    try {
      writeFileSync(
        join(dir, ".env.test.local"),
        "DATABASE_URL=postgres://worker-check.example/db\n"
      );

      loadRuntimeEnv(dir);

      expect(process.env.DATABASE_URL).toBe("postgres://worker-check.example/db");
    } finally {
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
