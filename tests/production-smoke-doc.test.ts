import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const doc = readFileSync(join(process.cwd(), "docs/PRODUCTION_SMOKE_TEST.md"), "utf8");

describe("production smoke checklist doc", () => {
  it("covers the full platform flow and reset notes", () => {
    for (const required of [
      "Signup or sign in",
      "Apple Music connect",
      "Library sync",
      "Draft Sort creation",
      "Preview generation",
      "Checkout or approved development bypass",
      "Full Sort processing",
      "Review",
      "Explicit export to Apple Music",
      "Rollback/reset notes",
      "/admin/reset-user"
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("identifies payment blocked and development bypass behavior", () => {
    expect(doc).toContain("Payment implementation is blocked until explicitly reopened.");
    expect(doc).toContain("PAYMENTS_DEV_BYPASS_ENABLED=true");
    expect(doc).toContain("Never enable a development bypass by default or in production.");
  });

  it("keeps Apple Music write-back behind explicit review export confirmation", () => {
    expect(doc).toMatch(/Any Apple Music write-back is possible before review plus explicit export\s+confirmation\./);
    expect(doc).toContain("App queues playlist creation only after confirmation.");
    expect(doc).toContain("Existing Apple Music playlists are not edited or deleted.");
  });
});
