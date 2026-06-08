import React from "react";

import { getRecipeTagLabel } from "@/modules/playlist-recipes/tags";
import type { PlaylistRecipeTag } from "@/types/domain";

export function SortBuilderTagChip({
  tag,
  onEditNote,
  onRemove
}: {
  tag: PlaylistRecipeTag;
  onEditNote: (tag: PlaylistRecipeTag) => void;
  onRemove: (tagId: string) => void;
}) {
  const label = getRecipeTagLabel(tag);

  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[rgba(255,45,85,0.28)] bg-[rgba(255,45,85,0.14)] px-3 text-sm font-medium text-platform-pink">
      <span>{label}</span>
      {tag.note ? (
        <span className="h-1.5 w-1.5 rounded-full bg-platform-pink" aria-label="Tag note saved" />
      ) : null}
      <button
        type="button"
        aria-label={`Edit review note for ${label}`}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
        onClick={() => onEditNote(tag)}
      >
        +
      </button>
      <button
        type="button"
        aria-label={`Remove ${label}`}
        className="flex h-6 w-6 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
        onClick={() => onRemove(tag.id)}
      >
        x
      </button>
    </span>
  );
}

export { SortBuilderTagChip as TagChip };
