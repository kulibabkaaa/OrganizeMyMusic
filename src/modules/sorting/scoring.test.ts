import { describe, expect, it } from "vitest";

import { compilePlaylistRules } from "@/modules/sorting/rule-compiler";
import {
  scoreTrackAgainstPlaylistRules,
  scoreTracksAgainstPlaylistRules
} from "@/modules/sorting/scoring";
import type { TrackFeatureProfile } from "@/modules/sorting/track-profile";
import type { PlaylistRecipe } from "@/types/domain";

const baseRecipe: PlaylistRecipe = {
  id: "recipe_1",
  userId: "user_1",
  sortRunId: "sort_1",
  position: 0,
  name: "Ukrainian workout rap",
  playlistNote: null,
  targetTrackMin: 25,
  targetTrackMax: 50,
  duplicatePolicy: "avoid_duplicates",
  allowExplicit: false,
  includeLibraryOnly: true,
  tags: [
    { id: "language_ukrainian", category: "language", value: "Ukrainian" },
    { id: "genre_rap", category: "genre", value: "rap" },
    { id: "mood_hype", category: "mood", value: "hype" },
    { id: "energy_high", category: "energy", value: "high" },
    { id: "activity_workout", category: "activity", value: "workout" }
  ],
  createdAt: "2026-05-27T00:00:00.000Z",
  updatedAt: "2026-05-27T00:00:00.000Z"
};

const matchingProfile: TrackFeatureProfile = {
  trackId: "track_1",
  fingerprint: "fingerprint_1",
  appleSongId: "apple_song_1",
  title: "Gym Rap",
  artist: "Artist",
  album: "Album",
  genre: "Hip-Hop/Rap",
  language: "ukrainian",
  moods: ["Workout", "Hype"],
  energy: 0.82,
  explicit: false,
  year: null,
  confidence: 0.9,
  classificationSource: "openai",
  classificationVersion: 1,
  hasClassification: true
};

describe("scoreTrackAgainstPlaylistRules", () => {
  it("scores hard filters and weighted matches with human-readable explanations", () => {
    const result = scoreTrackAgainstPlaylistRules({
      profile: matchingProfile,
      rules: compilePlaylistRules(baseRecipe)
    });

    expect(result).toMatchObject({
      status: "matched",
      score: 0.9,
      rawScore: 1,
      confidence: 0.9,
      matchedRuleCount: 5,
      explanations: [
        "Language matches ukrainian.",
        "Genre matches Hip-Hop/Rap.",
        "Mood matches Hype.",
        "Energy 0.82 fits high range.",
        "Activity workout matches moods Workout, Hype and energy 0.82."
      ]
    });
  });

  it("rejects explicit tracks before weighted scoring when a plan excludes explicit music", () => {
    const result = scoreTrackAgainstPlaylistRules({
      profile: {
        ...matchingProfile,
        explicit: true
      },
      rules: compilePlaylistRules(baseRecipe)
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "rejected",
        reason: "explicit",
        score: 0,
        explanations: ["Excluded because explicit tracks are not allowed."]
      })
    );
  });

  it("rejects tracks that fail selected language hard rules", () => {
    const result = scoreTrackAgainstPlaylistRules({
      profile: {
        ...matchingProfile,
        language: "english"
      },
      rules: compilePlaylistRules(baseRecipe)
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "rejected",
        reason: "language",
        explanations: ["Language english does not match ukrainian."]
      })
    );
  });

  it("represents missing classification as a safe rejection reason", () => {
    const result = scoreTrackAgainstPlaylistRules({
      profile: {
        ...matchingProfile,
        genre: null,
        language: null,
        moods: [],
        energy: null,
        confidence: 0,
        classificationSource: null,
        classificationVersion: null,
        hasClassification: false
      },
      rules: compilePlaylistRules(baseRecipe)
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "rejected",
        reason: "missing_classification",
        explanations: ["No classification is available for this track."]
      })
    );
  });

  it("uses energy range misses as deterministic rejection reasons", () => {
    const result = scoreTrackAgainstPlaylistRules({
      profile: {
        ...matchingProfile,
        language: "english",
        genre: "Pop",
        moods: ["Feel-Good"],
        energy: 0.25,
        confidence: 0.95
      },
      rules: compilePlaylistRules({
        ...baseRecipe,
        allowExplicit: true,
        tags: [{ id: "energy_high", category: "energy", value: "high" }]
      })
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "rejected",
        score: 0,
        rawScore: 0,
        reason: "energy",
        explanations: ["No scoring rules matched this track."]
      })
    );
  });

  it("scores activity rules through mood or energy matches", () => {
    const result = scoreTrackAgainstPlaylistRules({
      profile: {
        ...matchingProfile,
        moods: ["Feel-Good"],
        energy: 0.72,
        confidence: 0.8
      },
      rules: compilePlaylistRules({
        ...baseRecipe,
        allowExplicit: true,
        tags: [{ id: "activity_workout", category: "activity", value: "workout" }]
      })
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "matched",
        score: 0.16,
        rawScore: 0.2,
        explanations: ["Activity workout matches energy 0.72."]
      })
    );
  });
});

describe("scoreTracksAgainstPlaylistRules", () => {
  it("scores every track against a playlist plan deterministically", () => {
    const rules = compilePlaylistRules({
      ...baseRecipe,
      allowExplicit: true,
      tags: [{ id: "genre_rap", category: "genre", value: "rap" }]
    });
    const profiles: TrackFeatureProfile[] = [
      matchingProfile,
      {
        ...matchingProfile,
        trackId: "track_2",
        fingerprint: "fingerprint_2",
        genre: "Pop",
        confidence: 0.9
      }
    ];

    expect(scoreTracksAgainstPlaylistRules({ profiles, rules })).toEqual(
      scoreTracksAgainstPlaylistRules({ profiles, rules })
    );
    expect(scoreTracksAgainstPlaylistRules({ profiles, rules })).toEqual([
      expect.objectContaining({
        status: "matched",
        score: 0.315,
        explanations: ["Genre matches Hip-Hop/Rap."]
      }),
      expect.objectContaining({
        status: "rejected",
        reason: "genre"
      })
    ]);
  });
});
