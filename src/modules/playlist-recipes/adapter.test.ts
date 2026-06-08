import { describe, expect, it } from "vitest";

import { playlistRecipeToParsedRequest } from "@/modules/playlist-recipes/adapter";
import type { PlaylistRecipe } from "@/types/domain";

const baseRecipe: PlaylistRecipe = {
  id: "recipe_1",
  userId: "user_1",
  sortRunId: "sort_1",
  position: 0,
  name: "Sad Ukrainian gym rap",
  playlistNote: "Keep it intense but melancholy.",
  targetTrackMin: 25,
  targetTrackMax: 40,
  duplicatePolicy: "avoid_duplicates",
  allowExplicit: false,
  includeLibraryOnly: true,
  tags: [
    { id: "lang_uk", category: "language", value: "Ukrainian" },
    { id: "genre_rap", category: "genre", value: "hip-hop/rap" },
    { id: "mood_sad", category: "mood", value: "sad", note: "Melancholic." },
    { id: "energy_high", category: "energy", value: "high" },
    { id: "activity_workout", category: "activity", value: "workout" }
  ],
  createdAt: "2026-05-26T10:00:00.000Z",
  updatedAt: "2026-05-26T10:00:00.000Z"
};

describe("playlistRecipeToParsedRequest", () => {
  it("converts structured tags into existing playlist request rules", () => {
    expect(playlistRecipeToParsedRequest(baseRecipe)).toEqual({
      userPrompt: "Sad Ukrainian gym rap",
      parsedRules: {
        title: "Sad Ukrainian gym rap",
        languages: ["ukrainian"],
        genres: ["Hip-Hop/Rap"],
        subgenres: [],
        moods: ["Sad", "Workout", "Hype"],
        energyMin: 0.65,
        energyMax: null,
        excludeExplicit: true,
        source: "heuristic"
      }
    });
  });

  it("keeps unsupported descriptive tags as subgenre hints for compatibility", () => {
    const request = playlistRecipeToParsedRequest({
      ...baseRecipe,
      name: "Polish 2000s indie commute",
      allowExplicit: true,
      tags: [
        { id: "lang_pl", category: "language", value: "polish" },
        { id: "genre_indie", category: "genre", value: "indie" },
        { id: "era_2000s", category: "era", value: "2000s" },
        { id: "style_warm", category: "artist_style", value: "warm guitars" },
        { id: "energy_low", category: "energy", value: "low" }
      ]
    });

    expect(request.parsedRules).toMatchObject({
      title: "Polish 2000s indie commute",
      languages: ["polish"],
      genres: ["Indie/Alternative"],
      subgenres: ["2000s", "warm guitars"],
      energyMin: null,
      energyMax: 0.55,
      excludeExplicit: false
    });
  });

  it("keeps tag notes out of sorting rules because they are review context only", () => {
    const withoutNote = playlistRecipeToParsedRequest({
      ...baseRecipe,
      tags: [{ id: "mood_sad", category: "mood", value: "sad" }]
    });
    const withNote = playlistRecipeToParsedRequest({
      ...baseRecipe,
      tags: [
        {
          id: "mood_sad",
          category: "mood",
          value: "sad",
          note: "Avoid angry tracks and prefer acoustic songs."
        }
      ]
    });

    expect(withNote.parsedRules).toEqual(withoutNote.parsedRules);
  });
});
