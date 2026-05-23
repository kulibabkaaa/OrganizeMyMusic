import { describe, expect, it } from "vitest";

import { normalizeTrack } from "@/modules/library/normalize";
import { parsePlaylistRequestLines } from "@/modules/playlist-requests/parser";
import { generatePlaylists, generateRequestedPlaylists } from "@/modules/sorts/playlist-rules";
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
      subgenres: [],
      moods: ["Feel-Good"],
      energy: null,
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
      subgenres: [],
      moods: ["Feel-Good"],
      energy: null,
      confidence: 0.8,
      source: "heuristic",
      version: 1,
      metadataHash: "hash"
    }));

    const playlists = generatePlaylists(tracks, classifications);

    expect(playlists.some((playlist) => playlist.dimension === "genre")).toBe(true);
  });
});

describe("generateRequestedPlaylists", () => {
  const ukrainianRap = normalizeTrack({
    id: "uk_rap",
    name: "Rap Track",
    artistName: "Artist",
    genreNames: ["Hip-Hop/Rap"],
    contentRating: "explicit"
  });
  const gymRap = normalizeTrack({
    id: "gym_rap",
    name: "Gym Track",
    artistName: "Artist",
    genreNames: ["Hip-Hop/Rap"]
  });
  const sadPop = normalizeTrack({
    id: "sad_pop",
    name: "Sad Song",
    artistName: "Artist",
    genreNames: ["Pop"]
  });
  const tracks = [ukrainianRap, gymRap, sadPop];
  const classifications: TrackClassification[] = [
    {
      fingerprint: ukrainianRap.fingerprint,
      language: "ukrainian",
      genre: "Hip-Hop/Rap",
      subgenres: ["rap"],
      moods: ["Hype"],
      energy: 0.74,
      confidence: 0.9,
      source: "metadata",
      version: 1,
      metadataHash: "hash_uk"
    },
    {
      fingerprint: gymRap.fingerprint,
      language: "english",
      genre: "Hip-Hop/Rap",
      subgenres: ["rap"],
      moods: ["Workout", "Hype"],
      energy: 0.88,
      confidence: 0.86,
      source: "metadata",
      version: 1,
      metadataHash: "hash_gym"
    },
    {
      fingerprint: sadPop.fingerprint,
      language: "english",
      genre: "Pop",
      subgenres: [],
      moods: ["Sad", "Melancholy"],
      energy: 0.35,
      confidence: 0.8,
      source: "heuristic",
      version: 1,
      metadataHash: "hash_sad"
    }
  ];

  it("matches Ukrainian rap with score and reasons", () => {
    const [request] = parsePlaylistRequestLines(["Ukrainian rap"]);
    const playlists = generateRequestedPlaylists({
      requests: [request],
      tracks,
      classifications
    });

    expect(playlists).toHaveLength(1);
    expect(playlists[0]).toMatchObject({
      title: "Ukrainian Rap",
      trackCount: 1,
      confidenceLabel: "high"
    });
    expect(playlists[0]?.tracks).toEqual([
      expect.objectContaining({
        fingerprint: ukrainianRap.fingerprint,
        score: expect.any(Number),
        reason: expect.stringContaining("language")
      })
    ]);
  });

  it("allows a track to appear in multiple requested playlists when it matches both", () => {
    const requests = parsePlaylistRequestLines(["Ukrainian rap", "Gym rap"]);
    const playlists = generateRequestedPlaylists({ requests, tracks, classifications });

    expect(playlists).toHaveLength(2);
    expect(
      playlists.every((playlist) =>
        playlist.tracks.some((track) => track.fingerprint === ukrainianRap.fingerprint)
      )
    ).toBe(true);
  });

  it("matches mood and energy playlists", () => {
    const [request] = parsePlaylistRequestLines(["Gym rap"]);
    const playlists = generateRequestedPlaylists({ requests: [request], tracks, classifications });

    expect(playlists[0]?.tracks[0]).toMatchObject({
      fingerprint: gymRap.fingerprint,
      reason: expect.stringContaining("energy")
    });
  });

  it("returns no playlist for empty-result requests", () => {
    const [request] = parsePlaylistRequestLines(["Late night electronic"]);
    const playlists = generateRequestedPlaylists({ requests: [request], tracks, classifications });

    expect(playlists).toEqual([]);
  });
});
