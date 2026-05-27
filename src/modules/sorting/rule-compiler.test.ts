import { describe, expect, it } from "vitest";

import {
  compilePlaylistRules,
  SORTING_RULE_COMPILER_VERSION,
  sortingRuleWeights
} from "@/modules/sorting/rule-compiler";
import type { PlaylistRecipe } from "@/types/domain";

const baseRecipe: PlaylistRecipe = {
  id: "recipe_1",
  userId: "user_1",
  sortRunId: "sort_1",
  position: 0,
  name: "Ukrainian workout rap",
  playlistNote: "Keep the energy up.",
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

describe("compilePlaylistRules", () => {
  it("compiles visible tag categories into hard and weighted rules", () => {
    const rules = compilePlaylistRules(baseRecipe);

    expect(rules).toMatchObject({
      version: SORTING_RULE_COMPILER_VERSION,
      recipeId: "recipe_1",
      title: "Ukrainian workout rap",
      targetTrackMin: 25,
      targetTrackMax: 50,
      duplicatePolicy: "avoid_duplicates",
      includeLibraryOnly: true,
      hardRules: {
        excludeExplicit: true,
        languages: ["ukrainian"]
      },
      warnings: []
    });
    expect(rules.weightedRules).toEqual([
      {
        type: "genre",
        value: "Hip-Hop/Rap",
        weight: sortingRuleWeights.genre,
        sourceTagIds: ["genre_rap"]
      },
      {
        type: "mood",
        value: "Hype",
        weight: sortingRuleWeights.mood,
        sourceTagIds: ["mood_hype"]
      },
      {
        type: "energy",
        value: "high",
        weight: sortingRuleWeights.energy,
        target: { min: 0.65, max: null },
        sourceTagIds: ["energy_high"]
      },
      {
        type: "activity",
        value: "workout",
        weight: sortingRuleWeights.activity,
        moodTargets: ["Workout", "Hype"],
        energyTarget: { min: 0.65, max: null },
        sourceTagIds: ["activity_workout"]
      }
    ]);
  });

  it("does not add explicit exclusion when explicit tracks are allowed", () => {
    expect(
      compilePlaylistRules({
        ...baseRecipe,
        allowExplicit: true
      }).hardRules.excludeExplicit
    ).toBe(false);
  });

  it("merges duplicate normalized weighted rules while preserving source tag ids", () => {
    const rules = compilePlaylistRules({
      ...baseRecipe,
      tags: [
        { id: "genre_rap", category: "genre", value: "rap" },
        { id: "genre_trap", category: "genre", value: "trap" },
        { id: "mood_sad", category: "mood", value: "sad" },
        { id: "mood_heartbreak", category: "mood", value: "heartbreak" }
      ]
    });

    expect(rules.weightedRules).toEqual([
      expect.objectContaining({
        type: "genre",
        value: "Hip-Hop/Rap",
        sourceTagIds: ["genre_rap", "genre_trap"]
      }),
      expect.objectContaining({
        type: "mood",
        value: "Sad",
        sourceTagIds: ["mood_sad", "mood_heartbreak"]
      })
    ]);
  });

  it("returns warnings for unsupported categories and unknown visible tag values", () => {
    const rules = compilePlaylistRules({
      ...baseRecipe,
      tags: [
        { id: "era_2000s", category: "era", value: "2000s" },
        { id: "mood_unknown", category: "mood", value: "rainy" },
        { id: "activity_cooking", category: "activity", value: "cooking" }
      ]
    });

    expect(rules.weightedRules).toEqual([
      expect.objectContaining({
        type: "activity",
        value: "cooking",
        moodTargets: ["Chill", "Feel-Good"],
        energyTarget: { min: 0.35, max: 0.75 }
      })
    ]);
    expect(rules.warnings).toEqual([
      {
        tagId: "era_2000s",
        category: "era",
        value: "2000s",
        reason: "unsupported_category"
      },
      {
        tagId: "mood_unknown",
        category: "mood",
        value: "rainy",
        reason: "unknown_value"
      }
    ]);
  });
});
