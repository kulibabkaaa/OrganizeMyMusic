import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { PlaylistRecipeTag } from "@/types/domain";

const notePlaceholder =
  "Example: save for review: slower, melancholic, not angry.";

export function TagNotePanel({
  tag,
  onSaveNote,
  onRemoveNote,
  onClose
}: {
  tag: PlaylistRecipeTag;
  onSaveNote: (tagId: string, note: string) => void;
  onRemoveNote: (tagId: string) => void;
  onClose?: () => void;
}) {
  const [note, setNote] = useState(tag.note ?? "");

  useEffect(() => {
    setNote(tag.note ?? "");
  }, [tag.id, tag.note]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-platform-muted">
          Review context only
        </p>
        <p className="mt-1 text-sm leading-6 text-platform-secondary">
          Tag notes are saved with the playlist recipe for review. They do not change sorting.
        </p>
      </div>
      <label className="block text-sm font-semibold text-white">
        {`Note for ${tag.value}`}
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder={notePlaceholder}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-platform-muted focus:border-platform-pink"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="glass"
          onClick={() => {
            onSaveNote(tag.id, note);
            onClose?.();
          }}
        >
          Save review note
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onRemoveNote(tag.id);
            onClose?.();
          }}
        >
          Remove note
        </Button>
      </div>
    </div>
  );
}
