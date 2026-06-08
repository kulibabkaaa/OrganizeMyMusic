import type { PlaylistRecipeTag, PlaylistRecipeTagCategory } from "@/types/domain";
import { isCanonicalTagCategory } from "@/modules/sorting/tag-ontology";

export const playlistRecipeTagCategories = [
  { value: "mood", label: "Mood" },
  { value: "genre", label: "Genre" },
  { value: "language", label: "Language" },
  { value: "era", label: "Era" },
  { value: "region", label: "Region" },
  { value: "energy", label: "Energy" },
  { value: "activity", label: "Activity" },
  { value: "artist_style", label: "Artist style" },
  { value: "custom", label: "Custom" }
] as const satisfies readonly {
  value: PlaylistRecipeTagCategory;
  label: string;
}[];

export const visiblePlaylistRecipeTagCategories = playlistRecipeTagCategories.filter((category) =>
  isSupportedPlaylistRecipeTagCategory(category.value)
);

const tagSuggestions = {
  mood: ["Sad", "Chill", "Happy", "Dark", "Melancholy", "Romantic", "Hype"],
  genre: ["Pop", "Rap", "Rock", "Indie", "Electronic", "R&B", "Jazz"],
  language: ["English", "Spanish", "Ukrainian", "Polish", "French", "Mixed"],
  era: ["2020s", "2010s", "2000s", "1990s", "1980s", "Classic"],
  region: ["US", "UK", "Latin", "Eastern Europe", "K-pop", "Global"],
  energy: ["Low", "Medium", "High", "Warm", "Intense"],
  activity: ["Focus", "Workout", "Driving", "Late night", "Party", "Cooking"],
  artist_style: ["Vocal-forward", "Guitar-led", "Beat-driven", "Minimal", "Cinematic"],
  custom: []
} as const satisfies Record<PlaylistRecipeTagCategory, readonly string[]>;

export function isSupportedPlaylistRecipeTagCategory(category: PlaylistRecipeTagCategory) {
  return isCanonicalTagCategory(category);
}

export function getTagCategoryLabel(category: PlaylistRecipeTagCategory) {
  return playlistRecipeTagCategories.find((item) => item.value === category)?.label ?? category;
}

export function getTagSuggestions(category: PlaylistRecipeTagCategory) {
  return [...tagSuggestions[category]];
}

export function getRecipeTagLabel(tag: Pick<PlaylistRecipeTag, "category" | "value">) {
  return `${getTagCategoryLabel(tag.category)}: ${tag.value}`;
}

export function createPlaylistRecipeTag({
  category,
  value,
  note
}: {
  category: PlaylistRecipeTagCategory;
  value: string;
  note?: string | null;
}): PlaylistRecipeTag {
  const trimmedValue = value.trim();
  const trimmedNote = note?.trim();

  return {
    id: `tag_${category}_${slugify(trimmedValue)}`,
    category,
    value: trimmedValue,
    ...(trimmedNote ? { note: trimmedNote } : {})
  };
}

export function addRecipeTag(tags: PlaylistRecipeTag[], tag: PlaylistRecipeTag): PlaylistRecipeTag[] {
  if (hasRecipeTag(tags, tag) || tag.value.trim().length === 0) {
    return tags;
  }

  return [...tags, createPlaylistRecipeTag(tag)];
}

export function hasRecipeTag(
  tags: readonly Pick<PlaylistRecipeTag, "category" | "value">[],
  tag: Pick<PlaylistRecipeTag, "category" | "value">
) {
  return tags.some(
    (item) =>
      item.category === tag.category &&
      item.value.trim().toLowerCase() === tag.value.trim().toLowerCase()
  );
}

export function removeRecipeTag(tags: PlaylistRecipeTag[], tagId: string): PlaylistRecipeTag[] {
  return tags.filter((tag) => tag.id !== tagId);
}

export function updateRecipeTagNote(
  tags: PlaylistRecipeTag[],
  tagId: string,
  note: string
): PlaylistRecipeTag[] {
  const trimmedNote = note.trim();

  return tags.map((tag) => {
    if (tag.id !== tagId) {
      return tag;
    }

    if (!trimmedNote) {
      const withoutNote = { ...tag };
      delete withoutNote.note;
      return withoutNote;
    }

    return {
      ...tag,
      note: trimmedNote
    };
  });
}

export function removeRecipeTagNote(tags: PlaylistRecipeTag[], tagId: string): PlaylistRecipeTag[] {
  return updateRecipeTagNote(tags, tagId, "");
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "custom"
  );
}
