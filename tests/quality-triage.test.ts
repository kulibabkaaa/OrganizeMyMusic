import { describe, expect, it } from "vitest";

import { createInitialPreviewSelection, removePreviewTrack } from "@/modules/sorts/preview-selection";
import type { PreviewSnapshot } from "@/modules/sorts/preview-snapshot";
import { buildQualityTriageReport, formatQualityTriageReport } from "@/modules/sorts/quality-triage";

const snapshot: PreviewSnapshot = {
  sortRunId: "sort_private",
  librarySyncId: "sync_private",
  generatedAt: "2026-05-23T18:00:00.000Z",
  playlists: [
    {
      id: "playlist_ukrainian",
      dimension: "request",
      title: "Ukrainian Rap",
      description: "Generated from your request.",
      confidenceLabel: "medium",
      trackCount: 2,
      trackFingerprints: ["secret_fp_1", "secret_fp_2"],
      appleSongIds: ["secret_apple_1", "secret_apple_2"],
      tracks: [
        {
          fingerprint: "secret_fp_1",
          normalizedTrackId: "secret_track_1",
          appleSongId: "secret_apple_1",
          name: "Private Track Name",
          artistName: "Private Artist",
          albumName: "Private Album",
          position: 0,
          score: 0.67,
          reason: "language ukrainian; genre Hip-Hop/Rap"
        },
        {
          fingerprint: "secret_fp_2",
          normalizedTrackId: "secret_track_2",
          appleSongId: "secret_apple_2",
          name: "Another Private Track",
          artistName: "Another Private Artist",
          albumName: "Another Private Album",
          position: 1,
          score: 0.51,
          reason: "genre Hip-Hop/Rap; sparse mood/energy metadata"
        }
      ],
      qualityWarnings: ["Only 2 tracks matched this request. Review before confirming."],
      matchStats: {
        totalTrackCount: 10,
        classifiedTrackCount: 9,
        missingClassificationCount: 1,
        matchedTrackCount: 2,
        rejectedExplicitCount: 0,
        rejectedLanguageCount: 3,
        rejectedGenreCount: 2,
        rejectedMoodCount: 1,
        rejectedEnergyCount: 0,
        belowScoreCount: 1
      }
    },
    {
      id: "playlist_empty",
      dimension: "request",
      title: "Sad Slavic Songs",
      description: "No matching tracks were found.",
      confidenceLabel: "medium",
      trackCount: 0,
      trackFingerprints: [],
      appleSongIds: [],
      tracks: [],
      qualityWarnings: ["No tracks matched this request. It is excluded by default."],
      matchStats: {
        totalTrackCount: 10,
        classifiedTrackCount: 9,
        missingClassificationCount: 1,
        matchedTrackCount: 0,
        rejectedExplicitCount: 0,
        rejectedLanguageCount: 2,
        rejectedGenreCount: 2,
        rejectedMoodCount: 4,
        rejectedEnergyCount: 0,
        belowScoreCount: 1
      }
    }
  ]
};

describe("quality triage report", () => {
  it("summarizes playlist quality without track-level identifiers", () => {
    const selection = createInitialPreviewSelection(snapshot);
    const report = buildQualityTriageReport(snapshot, selection);
    const formatted = formatQualityTriageReport(report, "Sad Slavic Songs should include more mellow Slavic tracks.");

    expect(report).toMatchObject({
      sortRunId: "sort_private",
      librarySyncId: "sync_private",
      playlistCount: 2,
      selectedPlaylistCount: 1,
      proposedTrackCount: 2,
      selectedTrackCount: 2,
      emptyPlaylistCount: 1,
      lowMatchPlaylistCount: 1
    });
    expect(report.playlists[0]).toMatchObject({
      title: "Ukrainian Rap",
      proposedTrackCount: 2,
      selectedTrackCount: 2,
      topRejectionReason: "language"
    });
    expect(report.playlists[1]).toMatchObject({
      title: "Sad Slavic Songs",
      proposedTrackCount: 0,
      selectedTrackCount: 0,
      topRejectionReason: "mood"
    });
    expect(formatted).toContain("Ukrainian Rap: 2 proposed, 2 selected");
    expect(formatted).toContain("Sad Slavic Songs: 0 proposed, 0 selected");

    for (const privateValue of [
      "Private Track Name",
      "Private Artist",
      "Private Album",
      "Another Private Track",
      "secret_fp_1",
      "secret_track_1",
      "secret_apple_1"
    ]) {
      expect(JSON.stringify(report)).not.toContain(privateValue);
      expect(formatted).not.toContain(privateValue);
    }
  });

  it("respects removed tracks in selected aggregate counts", () => {
    const selection = removePreviewTrack(createInitialPreviewSelection(snapshot), "playlist_ukrainian", "secret_fp_1");
    const report = buildQualityTriageReport(snapshot, selection);

    expect(report.selectedPlaylistCount).toBe(1);
    expect(report.selectedTrackCount).toBe(1);
    expect(report.playlists[0]?.selectedTrackCount).toBe(1);
  });
});
