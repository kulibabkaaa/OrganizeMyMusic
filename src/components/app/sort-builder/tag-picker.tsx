import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  createPlaylistRecipeTag,
  getTagCategoryLabel,
  getTagSuggestions,
  hasRecipeTag,
  visiblePlaylistRecipeTagCategories
} from "@/modules/playlist-recipes/tags";
import type { PlaylistRecipeTag, PlaylistRecipeTagCategory } from "@/types/domain";

export function TagPicker({
  onAddTag,
  existingTags = [],
  defaultOpen = false
}: {
  onAddTag: (tag: PlaylistRecipeTag) => void;
  existingTags?: PlaylistRecipeTag[];
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [category, setCategory] = useState<PlaylistRecipeTagCategory>("mood");
  const [value, setValue] = useState("");
  const suggestions = getTagSuggestions(category);
  const trimmedValue = value.trim();
  const customDuplicate =
    trimmedValue.length > 0 && hasRecipeTag(existingTags, { category, value: trimmedValue });

  function addTag(nextValue: string) {
    const tagValue = nextValue.trim();

    if (!tagValue || hasRecipeTag(existingTags, { category, value: tagValue })) {
      return;
    }

    onAddTag(createPlaylistRecipeTag({ category, value: tagValue }));
    setValue("");
  }

  return (
    <div className="space-y-3">
      <Button variant="glass" onClick={() => setIsOpen((current) => !current)}>
        Add tag
      </Button>
      {isOpen ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-white">Tag category</legend>
            <div className="flex flex-wrap gap-2" aria-label="Tag categories">
              {visiblePlaylistRecipeTagCategories.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={category === item.value}
                  className={
                    category === item.value
                      ? "min-h-10 rounded-full border border-platform-pink bg-platform-pink/20 px-3 text-sm font-semibold text-white transition"
                      : "min-h-10 rounded-full border border-white/10 bg-white/[0.05] px-3 text-sm font-semibold text-platform-secondary transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
                  }
                  onClick={() => {
                    setCategory(item.value);
                    setValue("");
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          {suggestions.length > 0 ? (
            <fieldset className="mt-4 space-y-3">
              <legend className="text-sm font-semibold text-white">
                {getTagCategoryLabel(category)} suggestions
              </legend>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => {
                  const selected = hasRecipeTag(existingTags, { category, value: suggestion });

                  return (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={selected}
                      aria-pressed={selected}
                      className={
                        selected
                          ? "inline-flex min-h-10 items-center gap-2 rounded-full border border-platform-pink bg-platform-pink/20 px-3 text-sm font-semibold text-white opacity-75"
                          : "min-h-10 rounded-full border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-platform-secondary transition hover:border-platform-pink hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
                      }
                      onClick={() => addTag(suggestion)}
                    >
                      <span>{suggestion}</span>
                      {selected ? <span className="text-xs text-platform-secondary">Selected</span> : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="block min-w-0 text-sm font-semibold text-white">
              Own value
              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={`Type a ${getTagCategoryLabel(category).toLowerCase()} tag`}
                aria-describedby={customDuplicate ? "tag-picker-custom-error" : undefined}
                className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-platform-muted focus:border-platform-pink"
              />
            </label>
            <Button
              className="min-h-12"
              variant={trimmedValue && !customDuplicate ? "primary" : "disabled"}
              onClick={() => addTag(value)}
            >
              Save tag
            </Button>
          </div>
          {customDuplicate ? (
            <p id="tag-picker-custom-error" className="mt-2 text-sm leading-6 text-red-200">
              This tag is already selected.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-platform-secondary">
              Suggestions add immediately. Add your own value only when the right tag is not listed.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
