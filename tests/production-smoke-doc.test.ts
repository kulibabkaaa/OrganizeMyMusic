import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const doc = readFileSync(join(process.cwd(), "docs/PRODUCTION_SMOKE_TEST.md"), "utf8");
const acceptanceDoc = readFileSync(join(process.cwd(), "docs/MVP_ACCEPTANCE_CRITERIA.md"), "utf8");
const docsReadme = readFileSync(join(process.cwd(), "docs/README.md"), "utf8");

describe("production smoke checklist doc", () => {
  it("covers the full platform flow and reset notes", () => {
    for (const required of [
      "Signup or sign in",
      "Apple Music connect",
      "Library sync",
      "Click `Organize My Library`",
      "at least three playlist recipes",
      "Sort Builder shows playlist plans on the left",
      "Preview generation",
      "Start full organization from `/app/sorts/{sortId}/start`",
      "Full-organization processing",
      "Review",
      "Explicit export to Apple Music",
      "exported app-created playlists appear in `/app/playlists`",
      "/app/playlists/new",
      "playlist-owned recipe",
      "Process New Music",
      "recommendations are review-only",
      "saved as playlist review queues",
      "does not create",
      "platform_playlists",
      "fix_playlists_updated_at_default",
      "playlist_recipes_scope_check",
      "playlists.updated_at",
      "Rollback/reset notes",
      "/admin/reset-user"
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("identifies deferred billing and development bypass behavior", () => {
    expect(doc).toContain("Billing is deferred by default for the platform-first MVP.");
    expect(doc).toContain("PAYMENTS_DEV_BYPASS_ENABLED=true");
    expect(doc).toContain("Never enable a development bypass by default or in production.");
  });

  it("separates current platform-first status from historical Sort-first smoke evidence", () => {
    expect(docsReadme).toContain("As of 2026-06-08, the platform-first migration is implemented locally");
    expect(docsReadme).toContain("Remaining completion verification");
    expect(docsReadme).toContain("Historical Sort-first smoke evidence from 2026-05-23");
    expect(docsReadme).not.toContain(
      "As of 2026-05-23, the Apple Music MVP path has completed one production smoke"
    );
  });

  it("keeps Apple Music write-back behind explicit review export confirmation", () => {
    expect(doc).toMatch(/Any Apple Music write-back is possible before review and explicit export\s+confirmation\./);
    expect(doc).toContain("App queues playlist creation only after confirmation.");
    expect(doc).toContain("Existing Apple Music playlists are not edited or deleted.");
    expect(doc).toContain("Any product copy promises exact replacement, reorder, automatic sync, or");
    expect(acceptanceDoc).toContain(
      "Playlists can be written without review and explicit export confirmation."
    );
    expect(acceptanceDoc).not.toContain("Playlists are written without confirmation.");
  });
});
