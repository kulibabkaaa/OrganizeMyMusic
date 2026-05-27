import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { StartLibrarySyncButton } from "@/components/app/start-library-sync-button";
import type { LibrarySyncSummary } from "@/modules/library-syncs/queue";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

const activeSync: LibrarySyncSummary = {
  id: "sync_1",
  userId: "user_1",
  status: "syncing",
  rawTrackCount: 120,
  normalizedTrackCount: 80,
  duplicateCount: 4,
  errorSummary: null,
  createdAt: "2026-05-27T10:00:00.000Z",
  updatedAt: "2026-05-27T10:01:00.000Z"
};

describe("StartLibrarySyncButton", () => {
  it("shows automatic polling feedback while sync is active", () => {
    const markup = renderToStaticMarkup(<StartLibrarySyncButton latestSync={activeSync} />);

    expect(markup).toContain("Sync running");
    expect(markup).toContain("Sync status auto-refreshes every 3 seconds.");
    expect(markup).toContain("Refresh status");
  });
});
