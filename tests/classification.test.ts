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

  it("maps Apple metadata into the controlled genre taxonomy", () => {
    const track = normalizeTrack({
      id: "2",
      name: "Track",
      artistName: "Artist",
      genreNames: ["Hip-Hop/Rap"]
    });

    expect(inferGenre(track)).toBe("Hip-Hop/Rap");
  });

  it("uses title tokens to infer mood defaults", () => {
    const track = normalizeTrack({
      id: "3",
      name: "Summer Love",
      artistName: "Artist",
      genreNames: ["Pop"]
    });

    expect(inferMoods(track)).toContain("Romantic");
    expect(heuristicClassify(track).source).toBe("heuristic");
  });
});
