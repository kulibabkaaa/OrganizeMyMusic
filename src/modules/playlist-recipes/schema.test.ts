import { describe, expect, it } from "vitest";

import {
  playlistRecipeCreateSchema,
  playlistRecipeTagSchema,
  playlistRecipeUpdateSchema
} from "@/modules/playlist-recipes/schema";

describe("Playlist Recipe schema", () => {
  it("validates create input and applies safe defaults", () => {
    const recipe = playlistRecipeCreateSchema.parse({
      sortRunId: "22222222-2222-4222-8222-222222222222",
      position: 0,
      name: "  Sad late-night songs  ",
      playlistNote: "  Melancholic and slow.  ",
      targetTrackMin: 30,
      targetTrackMax: 50,
      tags: [
        {
          id: "mood-sad",
          category: "mood",
          value: "Sad",
          note: "  Intimate, not angry.  "
        }
      ]
    });

    expect(recipe).toEqual({
      sortRunId: "22222222-2222-4222-8222-222222222222",
      position: 0,
      name: "Sad late-night songs",
      playlistNote: "Melancholic and slow.",
      targetTrackMin: 30,
      targetTrackMax: 50,
      duplicatePolicy: "avoid_duplicates",
      allowExplicit: true,
      includeLibraryOnly: true,
      tags: [
        {
          id: "mood-sad",
          category: "mood",
          value: "Sad",
          note: "Intimate, not angry."
        }
      ]
    });
  });

  it("allows playlist-owned recipes during the platform migration", () => {
    const recipe = playlistRecipeCreateSchema.parse({
      playlistId: "33333333-3333-4333-8333-333333333333",
      position: 0,
      name: "Ukrainian Rap"
    });

    expect(recipe).toMatchObject({
      playlistId: "33333333-3333-4333-8333-333333333333",
      position: 0,
      name: "Ukrainian Rap"
    });
    expect("sortRunId" in recipe).toBe(false);
  });

  it("rejects invalid categories, empty names, and inverted target ranges", () => {
    expect(() =>
      playlistRecipeTagSchema.parse({
        id: "bad",
        category: "provider",
        value: "External provider"
      })
    ).toThrow();

    expect(() =>
      playlistRecipeCreateSchema.parse({
        sortRunId: "22222222-2222-4222-8222-222222222222",
        position: 0,
        name: " ",
        targetTrackMin: 50,
        targetTrackMax: 30
      })
    ).toThrow();

    expect(() =>
      playlistRecipeCreateSchema.parse({
        sortRunId: "22222222-2222-4222-8222-222222222222",
        position: 0,
        name: "Oversized playlist",
        targetTrackMin: 50,
        targetTrackMax: 501
      })
    ).toThrow();

    expect(() =>
      playlistRecipeCreateSchema.parse({
        position: 0,
        name: "Missing owner"
      })
    ).toThrow();
  });

  it("validates partial update input without requiring create-only fields", () => {
    const update = playlistRecipeUpdateSchema.parse({
      name: "Spanish pop reset",
      allowExplicit: false,
      tags: []
    });

    expect(update).toEqual({
      name: "Spanish pop reset",
      allowExplicit: false,
      tags: []
    });
  });
});
