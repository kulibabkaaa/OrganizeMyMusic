import { describe, expect, it, vi } from "vitest";

import { classifyTracks } from "@/modules/classification/batch-classify";
import {
  buildOpenAIClassificationPayload,
  parseOpenAIClassificationBatchOutput
} from "@/modules/classification/openai-client";
import { normalizeTrack } from "@/modules/library/normalize";

describe("OpenAI structured classification", () => {
  it("validates structured batch output into stored classifications", () => {
    const track = normalizeTrack({
      id: "apple-library-song-id",
      name: "Unknown Track",
      artistName: "Artist",
      albumName: "Album",
      genreNames: []
    });

    const classifications = parseOpenAIClassificationBatchOutput(
      JSON.stringify({
        classifications: [
          {
            trackId: track.fingerprint,
            language: "ukrainian",
            genre: "Hip-Hop/Rap",
            subgenres: ["ukrainian rap"],
            moods: ["Hype", "Dark"],
            energy: 0.82,
            confidence: 0.76
          }
        ]
      }),
      [track]
    );

    expect(classifications).toEqual([
      expect.objectContaining({
        fingerprint: track.fingerprint,
        language: "ukrainian",
        genre: "Hip-Hop/Rap",
        subgenres: ["ukrainian rap"],
        moods: ["Hype", "Dark"],
        energy: 0.82,
        confidence: 0.76,
        source: "openai",
        version: 1
      })
    ]);
    expect(classifications?.[0]?.metadataHash).toHaveLength(40);
  });

  it("returns null for invalid model output instead of throwing", () => {
    const track = normalizeTrack({
      id: "track",
      name: "Unknown Track",
      artistName: "Artist"
    });

    expect(
      parseOpenAIClassificationBatchOutput(
        JSON.stringify({
          classifications: [
            {
              trackId: track.fingerprint,
              language: "made_up_language",
              genre: "Pop",
              subgenres: [],
              moods: ["Definitely Not Allowed"],
              energy: 2,
              confidence: 1.4
            }
          ]
        }),
        [track]
      )
    ).toBeNull();
  });

  it("builds a compact prompt payload without raw Apple IDs", () => {
    const track = normalizeTrack({
      id: "apple-library-song-id",
      name: "Song",
      artistName: "Artist",
      albumName: "Album",
      genreNames: ["Pop"],
      contentRating: "explicit"
    });

    const payload = buildOpenAIClassificationPayload([track]);
    const serialized = JSON.stringify(payload);

    expect(payload.tracks).toEqual([
      {
        trackId: track.fingerprint,
        name: "Song",
        artistName: "Artist",
        albumName: "Album",
        genreNames: ["Pop"],
        contentRating: "explicit"
      }
    ]);
    expect(serialized).not.toContain("apple-library-song-id");
    expect(serialized).not.toContain("appleSongId");
  });

  it("batches ambiguous tracks and falls back to heuristics when OpenAI output is invalid", async () => {
    const tracks = [
      normalizeTrack({
        id: "1",
        name: "Unknown One",
        artistName: "Artist"
      }),
      normalizeTrack({
        id: "2",
        name: "Unknown Two",
        artistName: "Artist"
      })
    ];
    const classifyAmbiguousTracksWithOpenAI = vi.fn(async () => null);

    const classifications = await classifyTracks(tracks, {
      classifyAmbiguousTracksWithOpenAI
    });

    expect(classifyAmbiguousTracksWithOpenAI).toHaveBeenCalledOnce();
    expect(classifyAmbiguousTracksWithOpenAI).toHaveBeenCalledWith(tracks);
    expect(classifications).toEqual([
      expect.objectContaining({ fingerprint: tracks[0].fingerprint, source: "heuristic" }),
      expect.objectContaining({ fingerprint: tracks[1].fingerprint, source: "heuristic" })
    ]);
  });
});
