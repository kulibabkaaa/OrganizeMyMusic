import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PlaylistPreviewCard } from "@/components/app/preview/playlist-preview-card";
import { PreviewPaywallPage } from "@/components/app/preview/preview-paywall-page";
import { UnlockSortCard } from "@/components/app/preview/unlock-sort-card";
import type { LightweightPreviewSnapshot } from "@/modules/sorts/lightweight-preview";

const snapshot: LightweightPreviewSnapshot = {
  sortRunId: "33333333-3333-4333-8333-333333333333",
  librarySyncId: "11111111-1111-4111-8111-111111111111",
  generatedAt: "2026-05-26T12:00:00.000Z",
  playlists: [
    {
      id: "preview_recipe_1",
      recipeId: "recipe_1",
      playlistName: "Sad late-night songs",
      tags: [
        { id: "tag_mood_sad", category: "mood", value: "Sad" },
        { id: "tag_energy_low", category: "energy", value: "Low" }
      ],
      estimatedTrackCount: 42,
      confidenceLabel: "high",
      fitLabel: "strong",
      sampleTracks: [
        {
          fingerprint: "fp_1",
          normalizedTrackId: "track_1",
          appleSongId: "apple_1",
          name: "Moon Song",
          artistName: "Phoebe Bridgers",
          albumName: "Punisher",
          position: 0,
          score: 0.91,
          reason: "language english; mood Sad"
        },
        {
          fingerprint: "fp_2",
          normalizedTrackId: "track_2",
          appleSongId: "apple_2",
          name: "Cellophane",
          artistName: "FKA twigs",
          albumName: "Magdalene",
          position: 1,
          score: 0.87,
          reason: "mood Sad"
        }
      ],
      lockedTrackCount: 40,
      qualityWarnings: [
        "Only 2 tracks matched this playlist plan.",
        "1 library track could not be scored because metadata is missing."
      ]
    }
  ]
};

describe("preview paywall components", () => {
  it("renders a Playlist preview card with estimates, tags, samples, and locked rows", () => {
    const markup = renderToStaticMarkup(<PlaylistPreviewCard playlist={snapshot.playlists[0]} />);

    expect(markup).toContain("Sad late-night songs");
    expect(markup).toContain("42 estimated tracks");
    expect(markup).toContain("<caption");
    expect(markup).toContain("Preview samples for Sad late-night songs");
    expect(markup).toContain("Mood: Sad");
    expect(markup).toContain("Energy: Low");
    expect(markup).toContain("Moon Song");
    expect(markup).toContain("Phoebe Bridgers");
    expect(markup).toContain("Cellophane");
    expect(markup).toContain("40 locked matches");
    expect(markup).toContain("Sorting warnings");
    expect(markup).toContain("Only 2 tracks matched this playlist plan.");
    expect(markup).toContain("Adjust this playlist plan before checkout if these warnings look wrong.");
    expect(markup).toContain("Preview only. Final results are generated after checkout.");
  });

  it("renders an unlock panel tied to the Sort without export controls", () => {
    const markup = renderToStaticMarkup(
      <UnlockSortCard sortId={snapshot.sortRunId} playlistCount={snapshot.playlists.length} />
    );

    expect(markup).toContain("Unlock this Sort");
    expect(markup).toContain(
      "Run the full library analysis and review every generated playlist before anything is created in Apple Music."
    );
    expect(markup).toContain("Unlock full Sort");
    expect(markup).toContain(`/app/sorts/${snapshot.sortRunId}/checkout`);
    expect(markup).not.toContain("Export");
  });

  it("renders the full preview/paywall page without Apple Music write-back actions", () => {
    const markup = renderToStaticMarkup(
      <PreviewPaywallPage sortName="My Apple Music cleanup" snapshot={snapshot} />
    );

    expect(markup).toContain("Preview your Sort");
    expect(markup).toContain("See likely playlist shape before payment.");
    expect(markup).toContain("Sad late-night songs");
    expect(markup).toContain("Unlock this Sort");
    expect(markup).toContain("Back to dashboard");
    expect(markup).toContain("View all Sorts");
    expect(markup).toContain("Back to builder");
    expect(markup).toContain(`/app/sorts/${snapshot.sortRunId}/builder`);
    expect(markup).not.toContain("Create playlist");
    expect(markup).not.toContain("Export to Apple Music");
  });
});
