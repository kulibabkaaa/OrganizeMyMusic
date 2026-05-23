import { describe, expect, it } from "vitest";

import { heuristicClassify, inferGenre, inferLanguage, inferMoods } from "@/modules/classification/heuristics";
import { normalizeTrack } from "@/modules/library/normalize";

describe("classification heuristics", () => {
  it("detects non-latin scripts for language hints", () => {
    const track = normalizeTrack({
      id: "1",
      name: "夜に駆ける",
      artistName: "YOASOBI",
      genreNames: ["J-Pop"]
    });

    expect(inferLanguage(track)).toBe("japanese");
  });

  it("detects Ukrainian, Russian, Polish, and mixed language metadata hints", () => {
    expect(
      inferLanguage(
        normalizeTrack({
          id: "uk",
          name: "Місто",
          artistName: "Океан Ельзи",
          genreNames: ["Rock"]
        })
      )
    ).toBe("ukrainian");
    expect(
      inferLanguage(
        normalizeTrack({
          id: "ru",
          name: "Звезда",
          artistName: "Кино",
          genreNames: ["Rock"]
        })
      )
    ).toBe("russian");
    expect(
      inferLanguage(
        normalizeTrack({
          id: "pl",
          name: "Za późno",
          artistName: "Polski Artist",
          genreNames: ["Pop"]
        })
      )
    ).toBe("polish");
    expect(
      inferLanguage(
        normalizeTrack({
          id: "mixed",
          name: "Love Україна",
          artistName: "Artist",
          genreNames: ["Pop"]
        })
      )
    ).toBe("mixed");
  });

  it("detects instrumental tracks from reliable Apple genre metadata", () => {
    const track = normalizeTrack({
      id: "instrumental",
      name: "Piano Sonata No. 14",
      artistName: "Performer",
      genreNames: ["Classical", "Instrumental"]
    });

    expect(inferLanguage(track)).toBe("instrumental");
  });

  it("maps Apple metadata into the controlled genre taxonomy", () => {
    const track = normalizeTrack({
      id: "2",
      name: "Track",
      artistName: "Artist",
      genreNames: ["Hip-Hop/Rap"]
    });

    expect(inferGenre(track)).toBe("Hip-Hop/Rap");
  });

  it("uses metadata source and higher confidence for obvious Apple genres", () => {
    const track = normalizeTrack({
      id: "4",
      name: "Track",
      artistName: "Artist",
      genreNames: ["Hip-Hop/Rap"]
    });

    expect(heuristicClassify(track)).toMatchObject({
      genre: "Hip-Hop/Rap",
      source: "metadata",
      confidence: 0.86
    });
  });

  it("uses title tokens to infer mood defaults", () => {
    const track = normalizeTrack({
      id: "3",
      name: "Summer Love",
      artistName: "Artist",
      genreNames: ["Pop"]
    });

    expect(inferMoods(track)).toContain("Romantic");
    expect(heuristicClassify(track).source).toBe("metadata");
  });
});
