import { describe, expect, it } from "vitest";

import {
  assemblePlaylist,
  assemblePlaylists
} from "@/modules/sorting/playlist-assembler";
import type { CompiledPlaylistRules } from "@/modules/sorting/rule-compiler";
import type { TrackScoringResult } from "@/modules/sorting/scoring";
import type { TrackFeatureProfile } from "@/modules/sorting/track-profile";

const baseRules: CompiledPlaylistRules = {
  version: 1,
  recipeId: "recipe_1",
  title: "Workout rap",
  targetTrackMin: null,
  targetTrackMax: null,
  duplicatePolicy: "avoid_duplicates",
  includeLibraryOnly: true,
  hardRules: {
    excludeExplicit: false,
    languages: []
  },
  weightedRules: [],
  warnings: []
};

function profile(
  id: string,
  overrides: Partial<Pick<TrackFeatureProfile, "artist" | "album">> = {}
): TrackFeatureProfile {
  return {
    trackId: id,
    fingerprint: `fingerprint_${id}`,
    appleSongId: `apple_${id}`,
    title: `Track ${id}`,
    artist: overrides.artist ?? "Artist",
    album: overrides.album ?? "Album",
    genre: "Hip-Hop/Rap",
    language: "english",
    moods: ["Workout"],
    energy: 0.8,
    explicit: false,
    year: null,
    confidence: 0.9,
    classificationSource: "openai",
    classificationVersion: 1,
    hasClassification: true
  };
}

function matched(
  id: string,
  score: number,
  overrides: Partial<Pick<TrackFeatureProfile, "artist" | "album">> = {}
): TrackScoringResult {
  return {
    status: "matched",
    profile: profile(id, overrides),
    score,
    rawScore: score,
    confidence: 1,
    explanations: [`Matched fixture ${id}.`],
    matchedRuleCount: 1
  };
}

function rejected(id: string): TrackScoringResult {
  return {
    status: "rejected",
    profile: profile(id),
    score: 0,
    rawScore: 0,
    confidence: 1,
    reason: "genre",
    explanations: ["Genre did not match."],
    matchedRuleCount: 0
  };
}

describe("assemblePlaylist", () => {
  it("sorts matched candidates by score and respects target max", () => {
    const playlist = assemblePlaylist({
      rules: {
        ...baseRules,
        targetTrackMax: 2
      },
      candidates: [
        matched("low", 0.4),
        rejected("rejected"),
        matched("high", 0.9),
        matched("middle", 0.7)
      ]
    });

    expect(playlist.tracks).toEqual([
      expect.objectContaining({
        normalizedTrackId: "high",
        position: 0,
        score: 0.9,
        reason: "Matched fixture high."
      }),
      expect.objectContaining({
        normalizedTrackId: "middle",
        position: 1,
        score: 0.7,
        reason: "Matched fixture middle."
      })
    ]);
    expect(playlist.qualityWarnings).toEqual(["Limited to the top 2 tracks by score."]);
  });

  it("adds a quality warning when target minimum cannot be reached", () => {
    expect(
      assemblePlaylist({
        rules: {
          ...baseRules,
          targetTrackMin: 3,
          targetTrackMax: 10
        },
        candidates: [matched("one", 0.8)]
      }).qualityWarnings
    ).toEqual(["Only 1 track matched this playlist plan; target minimum is 3."]);
  });

  it("uses fingerprint as a deterministic tie breaker", () => {
    const playlist = assemblePlaylist({
      rules: baseRules,
      candidates: [matched("b", 0.8), matched("a", 0.8)]
    });

    expect(playlist.tracks.map((track) => track.normalizedTrackId)).toEqual(["a", "b"]);
  });

  it("penalizes repeated artists so a playlist is not dominated by one artist", () => {
    const playlist = assemblePlaylist({
      rules: {
        ...baseRules,
        targetTrackMax: 4
      },
      candidates: [
        matched("artist_a_1", 0.96, { artist: "Artist A", album: "Album 1" }),
        matched("artist_a_2", 0.95, { artist: "Artist A", album: "Album 2" }),
        matched("artist_a_3", 0.94, { artist: "Artist A", album: "Album 3" }),
        matched("artist_b_1", 0.84, { artist: "Artist B", album: "Album 4" }),
        matched("artist_c_1", 0.83, { artist: "Artist C", album: "Album 5" })
      ]
    });

    expect(playlist.tracks.map((track) => track.normalizedTrackId)).toEqual([
      "artist_a_1",
      "artist_b_1",
      "artist_c_1",
      "artist_a_2"
    ]);
    expect(playlist.tracks.filter((track) => track.artistName === "Artist A")).toHaveLength(2);
  });

  it("penalizes repeated albums independently from artist diversity", () => {
    const playlist = assemblePlaylist({
      rules: {
        ...baseRules,
        targetTrackMax: 4
      },
      candidates: [
        matched("album_a_1", 0.96, { artist: "Artist A", album: "Shared Album" }),
        matched("album_a_2", 0.95, { artist: "Artist B", album: "Shared Album" }),
        matched("album_a_3", 0.94, { artist: "Artist C", album: "Shared Album" }),
        matched("album_b_1", 0.88, { artist: "Artist D", album: "Other Album" }),
        matched("album_c_1", 0.87, { artist: "Artist E", album: "Third Album" })
      ]
    });

    expect(playlist.tracks.map((track) => track.normalizedTrackId)).toEqual([
      "album_a_1",
      "album_b_1",
      "album_a_2",
      "album_c_1"
    ]);
    expect(playlist.tracks.filter((track) => track.albumName === "Shared Album")).toHaveLength(2);
  });

  it("keeps high-score repeated artist exceptions when alternatives are weak", () => {
    const playlist = assemblePlaylist({
      rules: {
        ...baseRules,
        targetTrackMax: 2
      },
      candidates: [
        matched("star_1", 0.99, { artist: "Star", album: "First" }),
        matched("star_2", 0.96, { artist: "Star", album: "Second" }),
        matched("other_1", 0.3, { artist: "Other", album: "Third" })
      ]
    });

    expect(playlist.tracks.map((track) => track.normalizedTrackId)).toEqual(["star_1", "star_2"]);
  });

  it("warns when artist diversity cannot be satisfied", () => {
    const playlist = assemblePlaylist({
      rules: {
        ...baseRules,
        targetTrackMax: 4
      },
      candidates: [
        matched("star_1", 0.99, { artist: "Star", album: "First" }),
        matched("star_2", 0.97, { artist: "Star", album: "Second" }),
        matched("star_3", 0.95, { artist: "Star", album: "Third" }),
        matched("star_4", 0.93, { artist: "Star", album: "Fourth" }),
        matched("other_1", 0.4, { artist: "Other", album: "Fifth" })
      ]
    });

    expect(playlist.tracks.map((track) => track.normalizedTrackId)).toEqual([
      "star_1",
      "star_2",
      "star_3",
      "star_4"
    ]);
    expect(playlist.qualityWarnings).toContain(
      "Artist diversity is limited: 4/4 tracks are by Star."
    );
  });
});

describe("assemblePlaylists", () => {
  it("avoids duplicate tracks across playlist plans when requested", () => {
    const [first, second] = assemblePlaylists([
      {
        rules: {
          ...baseRules,
          recipeId: "recipe_1",
          title: "First"
        },
        candidates: [matched("shared", 0.9), matched("first_only", 0.7)]
      },
      {
        rules: {
          ...baseRules,
          recipeId: "recipe_2",
          title: "Second",
          targetTrackMin: 2
        },
        candidates: [matched("shared", 0.95), matched("second_only", 0.6)]
      }
    ]);

    expect(first?.tracks.map((track) => track.normalizedTrackId)).toEqual([
      "shared",
      "first_only"
    ]);
    expect(second?.tracks.map((track) => track.normalizedTrackId)).toEqual(["second_only"]);
    expect(second?.qualityWarnings).toEqual([
      "Only 1 track matched this playlist plan; target minimum is 2.",
      "1 duplicate candidate skipped because this playlist plan avoids repeats."
    ]);
  });

  it("allows duplicate tracks across playlist plans when policy allows repeats", () => {
    const [, second] = assemblePlaylists([
      {
        rules: {
          ...baseRules,
          recipeId: "recipe_1",
          title: "First"
        },
        candidates: [matched("shared", 0.9), matched("first_only", 0.7)]
      },
      {
        rules: {
          ...baseRules,
          recipeId: "recipe_2",
          title: "Second",
          duplicatePolicy: "allow_duplicates"
        },
        candidates: [matched("shared", 0.95), matched("second_only", 0.6)]
      }
    ]);

    expect(second?.tracks.map((track) => track.normalizedTrackId)).toEqual([
      "shared",
      "second_only"
    ]);
    expect(second?.qualityWarnings).toEqual([]);
  });
});
