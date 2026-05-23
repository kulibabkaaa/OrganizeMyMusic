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

  it("prefers ISRC over metadata fingerprints when deduping", () => {
    const albumVersion = normalizeTrack({
      id: "1",
      name: "Same Song",
      artistName: "Artist A",
      albumName: "Album Version",
      isrc: "USABC123"
    });
    const singleVersion = normalizeTrack({
      id: "2",
      name: "Same Song - Single",
      artistName: "Artist A",
      albumName: "Single Version",
      isrc: "usabc123",
      genreNames: ["Pop"]
    });

    expect(dedupeTracks([albumVersion, singleVersion])).toEqual([singleVersion]);
  });

  it("uses title, artist, and duration bucket as fallback fingerprint", () => {
    const first = normalizeTrack({
      id: "1",
      name: "Same Song",
      artistName: "Artist A",
      albumName: "Album One",
      durationInMillis: 201200
    });
    const second = normalizeTrack({
      id: "2",
      name: "Same Song",
      artistName: "Artist A",
      albumName: "Album Two",
      durationInMillis: 203900
    });

    expect(first.fingerprint).toBe(second.fingerprint);
    expect(dedupeTracks([first, second])).toHaveLength(1);
  });
});
