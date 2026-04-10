import { describe, expect, it } from "vitest";

import { normalizeTrack } from "@/modules/library/normalize";
import { generatePlaylists } from "@/modules/sorts/playlist-rules";
import type { TrackClassification } from "@/types/domain";

describe("generatePlaylists", () => {
  it("skips buckets below the minimum track threshold", () => {
    const tracks = Array.from({ length: 11 }, (_, index) =>
      normalizeTrack({
        id: `track_${index}`,
        name: `Song ${index}`,
        artistName: "Artist",
        albumName: "Album",
        genreNames: ["Pop"]
      })
    );

    const classifications: TrackClassification[] = tracks.map((track) => ({
      fingerprint: track.fingerprint,
      language: "english",
      genre: "Pop",
      moods: ["Feel-Good"],
      confidence: 0.8,
      source: "heuristic",
      version: 1,
      metadataHash: "hash"
    }));

    expect(generatePlaylists(tracks, classifications)).toHaveLength(0);
  });

  it("generates playlists once a bucket is large enough", () => {
    const tracks = Array.from({ length: 12 }, (_, index) =>
      normalizeTrack({
        id: `track_${index}`,
        name: `Song ${index}`,
        artistName: "Artist",
        albumName: "Album",
        genreNames: ["Pop"]
      })
    );

    const classifications: TrackClassification[] = tracks.map((track) => ({
      fingerprint: track.fingerprint,
      language: "english",
      genre: "Pop",
      moods: ["Feel-Good"],
      confidence: 0.8,
      source: "heuristic",
      version: 1,
      metadataHash: "hash"
    }));

    const playlists = generatePlaylists(tracks, classifications);

    expect(playlists.some((playlist) => playlist.dimension === "genre")).toBe(true);
  });
});

