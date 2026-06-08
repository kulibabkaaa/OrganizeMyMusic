import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LatestSortRunCard } from "@/components/app/latest-sort-run-card";
import { PipelineOverview } from "@/components/app/pipeline-overview";
import { PlatformQueuesCard } from "@/components/app/dashboard/platform-queues-card";
import type { PersistentPlaylist } from "@/types/domain";

const forbiddenUserCopy = [
  "Sort pipeline",
  "Operational view",
  "Parser ready",
  "Sort run",
  "assignments",
  "Apple IDs",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MVP-005",
  "Create a Sort",
  "playlist requests",
  "/api/sort-runs"
];

describe("normal user-facing copy", () => {
  it("uses platform-first product language in dashboard cards", () => {
    const playlists: PersistentPlaylist[] = [
      {
        id: "playlist_1",
        userId: "user_1",
        sourceProvider: "apple_music",
        name: "Ukrainian rap",
        description: "Saved recipe playlist.",
        status: "active",
        applePlaylistId: null,
        createdFromSortRunId: "11111111-1111-4111-8111-111111111111",
        latestLibrarySyncId: "22222222-2222-4222-8222-222222222222",
        lastProcessedNewMusicSyncId: null,
        lastGeneratedAt: "2026-05-26T12:00:00.000Z",
        lastExportedAt: null,
        createdAt: "2026-05-26T10:00:00.000Z",
        updatedAt: "2026-05-26T12:00:00.000Z",
        archivedAt: null
      }
    ];
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
        <LatestSortRunCard latestSortRun={null} />
        <PlatformQueuesCard
          playlists={playlists}
          reviewQueueCount={1}
          newMusicSummary={{
            latestSyncId: "33333333-3333-4333-8333-333333333333",
            previousSyncId: "22222222-2222-4222-8222-222222222222",
            newTrackCount: 3,
            canProcess: true,
            message: "3 newly synced songs are ready for playlist suggestions."
          }}
        />
      </div>
    );

    for (const phrase of forbiddenUserCopy) {
      expect(markup).not.toContain(phrase);
    }

    expect(markup).toContain("Preview ready");
    expect(markup).toContain("Exported");
    expect(markup).toContain("Saved playlists and queues");
    expect(markup).toContain("Create playlist plans after a completed sync");
    expect(markup).toContain("Create Playlist");
    expect(markup).toContain("Process New Music");
    expect(markup).toContain("/app/sorts/11111111-1111-4111-8111-111111111111");
    expect(markup).toContain("/app/playlists?focus=review");
    expect(markup).toContain("/app/library#new-music");
    expect(markup).not.toContain('href="/sorts/');
  });
});
