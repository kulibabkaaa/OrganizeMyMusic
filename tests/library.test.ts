import { describe, expect, it } from "vitest";

import { dedupeTracks } from "@/modules/library/dedupe";
import { normalizeTrack } from "@/modules/library/normalize";

describe("normalizeTrack", () => {
  it("sanitizes featuring and version noise before fingerprinting", () => {
    const track = normalizeTrack({
      id: "1",
      name: "Midnight City (feat. Someone) - Remastered",
      artistName: "M83",
      albumName: "Hurry Up, We're Dreaming"
    });

    expect(track.normalizedName).toContain("midnight city");
    expect(track.normalizedName).not.toContain("feat");
    expect(track.normalizedName).not.toContain("remaster");
  });
});

describe("dedupeTracks", () => {
  it("keeps the richer duplicate when fingerprints collide", () => {
    const base = normalizeTrack({
      id: "1",
      name: "Song A",
      artistName: "Artist A",
      albumName: "Album A"
    });
    const richer = { ...base, isrc: "abc123", genreNames: ["Pop"] };

    expect(dedupeTracks([base, richer])).toEqual([richer]);
  });
});

