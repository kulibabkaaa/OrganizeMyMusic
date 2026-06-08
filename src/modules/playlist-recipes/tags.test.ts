import { describe, expect, it } from "vitest";

import {
  addRecipeTag,
  createPlaylistRecipeTag,
  getTagCategoryLabel,
  hasRecipeTag,
  isSupportedPlaylistRecipeTagCategory,
  playlistRecipeTagCategories,
  visiblePlaylistRecipeTagCategories,
  removeRecipeTag,
  removeRecipeTagNote,
  updateRecipeTagNote
} from "@/modules/playlist-recipes/tags";

describe("Playlist Recipe tags", () => {
  it("exposes all structured tag categories", () => {
    expect(playlistRecipeTagCategories.map((category) => category.value)).toEqual([
      "mood",
      "genre",
      "language",
      "era",
      "region",
      "energy",
      "activity",
      "artist_style",
      "custom"
    ]);
    expect(visiblePlaylistRecipeTagCategories.map((category) => category.value)).toEqual([
      "mood",
      "genre",
      "language",
      "energy",
      "activity"
    ]);
    expect(getTagCategoryLabel("artist_style")).toBe("Artist style");
    expect(isSupportedPlaylistRecipeTagCategory("artist_style")).toBe(false);
  });

  it("creates normalized tags and avoids duplicate category/value pairs", () => {
    const tag = createPlaylistRecipeTag({
      category: "mood",
      value: "  Sad  ",
      note: "  Slower, not angry.  "
    });
    const tags = addRecipeTag([], tag);

    expect(tag).toMatchObject({
      category: "mood",
      value: "Sad",
      note: "Slower, not angry."
    });
    expect(addRecipeTag(tags, { ...tag, id: "duplicate" })).toHaveLength(1);
    expect(hasRecipeTag(tags, { category: "mood", value: " sad " })).toBe(true);
    expect(hasRecipeTag(tags, { category: "genre", value: "Sad" })).toBe(false);
  });

  it("updates and removes Tag Notes without touching other tags", () => {
    const tags = [
      createPlaylistRecipeTag({ category: "mood", value: "Sad" }),
      createPlaylistRecipeTag({ category: "energy", value: "Low" })
    ];
    const withNote = updateRecipeTagNote(tags, tags[0].id, "Melancholic, slow, intimate.");

    expect(withNote[0]).toMatchObject({
      value: "Sad",
      note: "Melancholic, slow, intimate."
    });
    expect(withNote[1]).toEqual(tags[1]);
    expect(removeRecipeTagNote(withNote, tags[0].id)[0].note).toBeUndefined();
    expect(removeRecipeTag(withNote, tags[1].id)).toEqual([withNote[0]]);
  });
});
