import React, { useState } from "react";

import { SortBuilderTagChip } from "@/components/app/sort-builder/tag-chip";
import { TagNotePanel } from "@/components/app/sort-builder/tag-note-panel";
import { TagPicker } from "@/components/app/sort-builder/tag-picker";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  getTargetSizeValidationMessage,
  type BuilderRecipe
} from "@/components/app/sort-builder/sort-builder-validation";
import {
  addRecipeTag,
  removeRecipeTag,
  removeRecipeTagNote,
  updateRecipeTagNote
} from "@/modules/playlist-recipes/tags";
import type { PlaylistRecipeDuplicatePolicy } from "@/types/domain";

const targetSizePresets = [
  { id: "15-25", label: "15-25", min: 15, max: 25 },
  { id: "25-50", label: "25-50", min: 25, max: 50 },
  { id: "50-100", label: "50-100", min: 50, max: 100 }
] as const;

type TargetSizePresetId = (typeof targetSizePresets)[number]["id"] | "custom";

export function PlaylistRecipeEditor({
  recipe,
  onChange
}: {
  recipe: BuilderRecipe | null;
  onChange: (recipe: BuilderRecipe) => void;
}) {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [customTargetRecipeId, setCustomTargetRecipeId] = useState<string | null>(null);

  if (!recipe) {
    return (
      <Card className="min-h-96">
        <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
          Add a playlist
        </h2>
        <p className="mt-2 text-sm leading-7 text-platform-secondary">
          Create one playlist before generating this Sort.
        </p>
      </Card>
    );
  }

  const selectedTag = recipe.tags.find((tag) => tag.id === selectedTagId) ?? null;
  const selectedTargetSizePreset =
    customTargetRecipeId === recipe.id ? "custom" : getTargetSizePresetId(recipe);
  const targetSizeValidationMessage = getTargetSizeValidationMessage(recipe);

  return (
    <Card className="min-w-0 space-y-5">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
        <div className="min-w-0">
          <StatusPill label="Playlist recipe" tone="pink" />
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-[0em] text-white">
            {recipe.name}
          </h2>
        </div>
        <span className="max-w-full rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-sm text-platform-secondary">
          {formatTargetSize(recipe)}
        </span>
      </div>

      <label className="block min-w-0 text-sm font-semibold text-white">
        Playlist name
        <input
          value={recipe.name}
          onChange={(event) => onChange({ ...recipe, name: event.target.value })}
          className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-platform-muted focus:border-platform-pink"
        />
      </label>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">Tags</h3>
            <p className="mt-1 text-sm text-platform-secondary">
              Add the mood, genre, language, or use-case signals this playlist should match.
            </p>
          </div>
          <TagPicker
            existingTags={recipe.tags}
            onAddTag={(tag) =>
              onChange({
                ...recipe,
                tags: addRecipeTag(recipe.tags, tag)
              })
            }
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {recipe.tags.length > 0 ? (
            recipe.tags.map((tag) => (
              <SortBuilderTagChip
                key={tag.id}
                tag={tag}
                onEditNote={(selectedTag) => setSelectedTagId(selectedTag.id)}
                onRemove={(tagId) => {
                  onChange({ ...recipe, tags: removeRecipeTag(recipe.tags, tagId) });
                  if (selectedTagId === tagId) {
                    setSelectedTagId(null);
                  }
                }}
              />
            ))
          ) : (
            <p className="text-sm text-platform-secondary">No tags yet.</p>
          )}
        </div>
        {selectedTag ? (
          <div className="mt-3">
            <p className="text-sm leading-6 text-platform-secondary">
              Review note selected for {selectedTag.value}. Edit it in Advanced settings.
            </p>
          </div>
        ) : null}
      </div>

      <label className="block min-w-0 text-sm font-semibold text-white">
        Recipe instructions
        <textarea
          value={recipe.playlistNote ?? ""}
          onChange={(event) =>
            onChange({ ...recipe, playlistNote: event.target.value.trim() ? event.target.value : null })
          }
          rows={4}
          className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-platform-muted focus:border-platform-pink"
          placeholder="Melancholic, slow, intimate songs. Avoid angry or aggressive tracks."
        />
      </label>

      <section className="space-y-4 border-t border-white/10 pt-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Advanced settings</h3>
          <p className="mt-1 text-sm leading-6 text-platform-secondary">
            Tune size, duplicate handling, and library constraints after the playlist idea is clear.
          </p>
        </div>

        {selectedTag ? (
          <TagNotePanel
            tag={selectedTag}
            onSaveNote={(tagId, note) =>
              onChange({ ...recipe, tags: updateRecipeTagNote(recipe.tags, tagId, note) })
            }
            onRemoveNote={(tagId) =>
              onChange({ ...recipe, tags: removeRecipeTagNote(recipe.tags, tagId) })
            }
            onClose={() => setSelectedTagId(null)}
          />
        ) : null}

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-semibold text-white">Target size</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {targetSizePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={selectedTargetSizePreset === preset.id}
                  onClick={() => {
                    setCustomTargetRecipeId(null);
                    onChange({
                      ...recipe,
                      targetTrackMin: preset.min,
                      targetTrackMax: preset.max
                    });
                  }}
                  className={
                    selectedTargetSizePreset === preset.id
                      ? "min-h-11 rounded-2xl border border-platform-pink bg-platform-pink/20 px-3 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,87,139,0.16)] transition"
                      : "min-h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-3 text-sm font-semibold text-platform-secondary transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
                  }
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={selectedTargetSizePreset === "custom"}
                onClick={() => {
                  setCustomTargetRecipeId(recipe.id);
                  onChange({
                    ...recipe,
                    targetTrackMin: recipe.targetTrackMin ?? 25,
                    targetTrackMax: recipe.targetTrackMax ?? 50
                  });
                }}
                className={
                  selectedTargetSizePreset === "custom"
                    ? "min-h-11 rounded-2xl border border-platform-pink bg-platform-pink/20 px-3 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,87,139,0.16)] transition"
                    : "min-h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-3 text-sm font-semibold text-platform-secondary transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
                }
              >
                Custom
              </button>
            </div>
            {selectedTargetSizePreset === "custom" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block min-w-0 text-xs font-semibold uppercase text-platform-muted">
                  Minimum
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={500}
                    step={1}
                    aria-label="Target size minimum"
                    value={recipe.targetTrackMin ?? ""}
                    onChange={(event) =>
                      onChange({
                        ...recipe,
                        targetTrackMin: parseTargetTrackCount(event.target.value)
                      })
                    }
                    className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition focus:border-platform-pink"
                  />
                </label>
                <label className="block min-w-0 text-xs font-semibold uppercase text-platform-muted">
                  Maximum
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={500}
                    step={1}
                    aria-label="Target size maximum"
                    value={recipe.targetTrackMax ?? ""}
                    onChange={(event) =>
                      onChange({
                        ...recipe,
                        targetTrackMax: parseTargetTrackCount(event.target.value)
                      })
                    }
                    className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition focus:border-platform-pink"
                  />
                </label>
              </div>
            ) : null}
            <p
              className={
                targetSizeValidationMessage
                  ? "text-sm leading-6 text-red-200"
                  : "text-sm leading-6 text-platform-secondary"
              }
            >
              {targetSizeValidationMessage ?? "Stored as numeric minimum and maximum track counts."}
            </p>
          </fieldset>
          <label className="block min-w-0 text-sm font-semibold text-white">
            Duplicate handling
            <select
              value={recipe.duplicatePolicy}
              onChange={(event) =>
                onChange({
                  ...recipe,
                  duplicatePolicy: event.target.value as PlaylistRecipeDuplicatePolicy
                })
              }
              className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-[#171113] px-4 py-3 text-sm text-white outline-none transition focus:border-platform-pink"
            >
              <option value="avoid_duplicates">Avoid duplicates where possible</option>
              <option value="allow_duplicates">Allow repeats across playlists</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold text-white">
            <input
              type="checkbox"
              checked={recipe.allowExplicit}
              onChange={(event) => onChange({ ...recipe, allowExplicit: event.target.checked })}
              className="h-4 w-4 accent-platform-pink"
            />
            Allow explicit tracks
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold text-white">
            <input
              type="checkbox"
              checked={recipe.includeLibraryOnly}
              onChange={(event) => onChange({ ...recipe, includeLibraryOnly: event.target.checked })}
              className="h-4 w-4 accent-platform-pink"
            />
            Include library songs only
          </label>
        </div>
      </section>
    </Card>
  );
}

function parseTargetTrackCount(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) ? parsed : null;
}

export function getTargetSizePresetId(
  recipe: Pick<BuilderRecipe, "targetTrackMin" | "targetTrackMax">
): TargetSizePresetId {
  const preset = targetSizePresets.find(
    (item) => item.min === recipe.targetTrackMin && item.max === recipe.targetTrackMax
  );

  return preset?.id ?? "custom";
}

export function formatTargetSize(recipe: Pick<BuilderRecipe, "targetTrackMin" | "targetTrackMax">) {
  if (recipe.targetTrackMin && recipe.targetTrackMax) {
    return `${recipe.targetTrackMin}-${recipe.targetTrackMax} tracks`;
  }

  if (recipe.targetTrackMin) {
    return `${recipe.targetTrackMin}+ tracks`;
  }

  return "Any size";
}
