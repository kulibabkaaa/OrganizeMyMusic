import { describe, expect, it } from "vitest";

import {
  isCanonicalTagCategory,
  normalizePlaylistRecipeTag,
  normalizeTagValue,
  supportedCanonicalTagCategories
} from "@/modules/sorting/tag-ontology";

describe("tag ontology", () => {
  it("normalizes tag text for stable synonym matching", () => {
    expect(normalizeTagValue("  Late-Night__Focus  ")).toBe("late night focus");
  });

  it("maps mood synonyms to canonical values", () => {
    expect(normalizePlaylistRecipeTag({ category: "mood", value: "sad" })).toEqual({
      status: "supported",
      category: "mood",
      value: "Sad"
    });
    expect(normalizePlaylistRecipeTag({ category: "mood", value: "melancholic" })).toEqual({
      status: "supported",
      category: "mood",
      value: "Melancholy"
    });
    expect(normalizePlaylistRecipeTag({ category: "mood", value: "heartbreak" })).toEqual({
      status: "supported",
      category: "mood",
      value: "Sad"
    });
  });

  it("maps genre synonyms to canonical values", () => {
    for (const value of ["hip hop", "rap", "trap", "hip-hop/rap"]) {
      expect(normalizePlaylistRecipeTag({ category: "genre", value })).toEqual({
        status: "supported",
        category: "genre",
        value: "Hip-Hop/Rap"
      });
    }
  });

  it("maps language, energy, and activity tags to canonical values", () => {
    expect(normalizePlaylistRecipeTag({ category: "language", value: "mixed language" })).toEqual({
      status: "supported",
      category: "language",
      value: "mixed"
    });
    expect(normalizePlaylistRecipeTag({ category: "energy", value: "intense" })).toEqual({
      status: "supported",
      category: "energy",
      value: "high"
    });
    expect(normalizePlaylistRecipeTag({ category: "activity", value: "commute" })).toEqual({
      status: "supported",
      category: "activity",
      value: "driving"
    });
  });

  it("returns explicit unsupported results for unsupported categories and unknown values", () => {
    expect(normalizePlaylistRecipeTag({ category: "era", value: "2000s" })).toEqual({
      status: "unsupported",
      category: "era",
      value: "2000s",
      reason: "unsupported_category"
    });
    expect(normalizePlaylistRecipeTag({ category: "mood", value: "rainy" })).toEqual({
      status: "unsupported",
      category: "mood",
      value: "rainy",
      reason: "unknown_value"
    });
  });

  it("exposes the visible canonical categories", () => {
    expect(supportedCanonicalTagCategories).toEqual([
      "mood",
      "genre",
      "language",
      "energy",
      "activity"
    ]);
    expect(isCanonicalTagCategory("activity")).toBe(true);
    expect(isCanonicalTagCategory("custom")).toBe(false);
  });
});
