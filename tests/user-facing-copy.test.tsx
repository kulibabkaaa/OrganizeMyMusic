import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LatestSortRunCard } from "@/components/app/latest-sort-run-card";
import { PipelineOverview } from "@/components/app/pipeline-overview";
import { PlaylistRequestCard } from "@/components/app/playlist-request-card";

const forbiddenUserCopy = [
  "Sort pipeline",
  "Operational view",
  "Parser ready",
  "Sort run",
  "assignments",
  "Apple IDs",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MVP-005"
];

describe("normal user-facing copy", () => {
  it("uses product language in legacy dashboard cards", () => {
    const markup = renderToStaticMarkup(
      <div>
        <PipelineOverview />
        <LatestSortRunCard
          latestSortRun={{
            id: "11111111-1111-4111-8111-111111111111",
            state: "completed",
            paymentStatus: "paid",
            createdAt: "2026-05-26T10:00:00.000Z",
            updatedAt: "2026-05-26T12:00:00.000Z",
            playlistCount: 2,
            selectedPlaylistCount: 2,
            applePlaylistIdCount: 2,
            trackAssignmentCount: 20
          }}
        />
        <PlaylistRequestCard canRequest librarySyncId="22222222-2222-4222-8222-222222222222" />
      </div>
    );

    for (const phrase of forbiddenUserCopy) {
      expect(markup).not.toContain(phrase);
    }

    expect(markup).toContain("Create a Sort");
    expect(markup).toContain("Preview ready");
    expect(markup).toContain("Exported");
    expect(markup).toContain("Library needs attention");
    expect(markup).toContain("/app/sorts/11111111-1111-4111-8111-111111111111");
    expect(markup).not.toContain('href="/sorts/');
  });
});
