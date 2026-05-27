import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LibrarySyncCard } from "@/components/app/library-sync-card";
import type { LibrarySyncSummary } from "@/modules/library-syncs/queue";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

const completedSync: LibrarySyncSummary = {
  id: "sync_1",
  userId: "user_1",
  status: "completed",
  rawTrackCount: 120,
  normalizedTrackCount: 118,
  duplicateCount: 2,
  errorSummary: null,
  createdAt: "2026-05-26T10:00:00.000Z",
  updatedAt: "2026-05-26T10:05:00.000Z"
};

describe("LibrarySyncCard", () => {
  it("labels the custom sync progress bar for assistive technology", () => {
    const markup = renderToStaticMarkup(
      <LibrarySyncCard
        canStart
        latestSync={completedSync}
        events={[]}
      />
    );

    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-label="Library sync progress"');
    expect(markup).toContain('aria-valuenow="100"');
    expect(markup).toContain('aria-valuemin="0"');
    expect(markup).toContain('aria-valuemax="100"');
    expect(markup).toContain("Start background sync");
    expect(markup).toContain("Refresh status");
  });
});
