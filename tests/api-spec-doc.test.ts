import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const apiSpec = readFileSync(join(process.cwd(), "docs/API_SPEC.md"), "utf8");

describe("API spec doc", () => {
  it("does not advertise unsupported legacy preview or events subroutes as active endpoints", () => {
    expect(apiSpec).not.toContain("### `GET /api/sort-runs/:sortRunId/preview`");
    expect(apiSpec).not.toContain("### `GET /api/sort-runs/:sortRunId/events`");
    expect(apiSpec).toContain("Unsupported legacy subroutes");
    expect(apiSpec).toContain("Use `POST /api/app/sorts/:sortId/preview` for Sort previews.");
  });

  it("documents disabled legacy Sort confirmation instead of legacy write-back", () => {
    expect(apiSpec).not.toContain(
      "Confirms playlists approved for export and queues Apple Music write-back."
    );
    expect(apiSpec).toContain("Legacy confirmation is disabled. Returns `409`.");
    expect(apiSpec).toContain("/api/app/sorts/uuid/export");
  });
});
