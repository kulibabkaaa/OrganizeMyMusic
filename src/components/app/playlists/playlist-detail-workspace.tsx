"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDialogAccessibility } from "@/components/ui/dialog-accessibility";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  PlaylistGenerationHistoryItem,
  PlaylistGenerationView
} from "@/modules/playlists/generation-store";
import type {
  PersistentPlaylist,
  PlaylistRecipe,
  PlaylistRecipeTag,
  PlaylistRecipeTagCategory,
  PlaylistTrackDecision
} from "@/types/domain";

export function PlaylistDetailWorkspace({
  playlist,
  recipe,
  latestGeneration,
  generationHistory
}: {
  playlist: PersistentPlaylist;
  recipe: PlaylistRecipe | null;
  latestGeneration: PlaylistGenerationView | null;
  generationHistory: PlaylistGenerationHistoryItem[];
}) {
  const router = useRouter();
  const [currentRecipe, setCurrentRecipe] = useState(recipe);
  const [recipeName, setRecipeName] = useState(recipe?.name ?? playlist.name);
  const [recipeNote, setRecipeNote] = useState(recipe?.playlistNote ?? "");
  const [recipeTags, setRecipeTags] = useState(recipe ? formatRecipeTags(recipe.tags) : "");
  const [recipeTargetMax, setRecipeTargetMax] = useState(
    recipe?.targetTrackMax ? recipe.targetTrackMax.toString() : "50"
  );
  const [recipeAllowExplicit, setRecipeAllowExplicit] = useState(recipe?.allowExplicit ?? true);
  const [recipeLibraryOnly, setRecipeLibraryOnly] = useState(recipe?.includeLibraryOnly ?? true);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [recipeMessage, setRecipeMessage] = useState<string | null>(null);
  const [generation, setGeneration] = useState(latestGeneration);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const keptCount = useMemo(
    () => generation?.tracks.filter((track) => track.decision === "keep").length ?? 0,
    [generation]
  );
  const removedCount = (generation?.tracks.length ?? 0) - keptCount;
  const isReviewComplete =
    generation?.generation.status === "reviewed" ||
    generation?.generation.status === "exporting" ||
    generation?.generation.status === "exported" ||
    generation?.generation.status === "failed";
  const activeGenerationKind = getGenerationKind(generation?.generation.recipeSnapshot);
  const canRetryExport = generation?.generation.status === "failed";
  const canExport =
    Boolean(generation) &&
    keptCount > 0 &&
    (generation?.generation.status === "reviewed" || canRetryExport);
  const canEditTrackDecisions = generation?.generation.status === "ready_for_review";
  const hasGeneratedBefore = generationHistory.length > 0 || Boolean(generation);

  async function saveRecipe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingRecipe(true);
    setRecipeError(null);
    setRecipeMessage(null);

    try {
      const response = await fetch(`/api/app/playlists/${encodeURIComponent(playlist.id)}/recipe`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recipeName,
          playlistNote: recipeNote,
          targetTrackMin: null,
          targetTrackMax: parseTargetTrackCount(recipeTargetMax),
          duplicatePolicy: currentRecipe?.duplicatePolicy ?? "avoid_duplicates",
          allowExplicit: recipeAllowExplicit,
          includeLibraryOnly: recipeLibraryOnly,
          tags: parseRecipeTags(recipeTags)
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { recipe?: PlaylistRecipe; error?: string }
        | null;

      if (!response.ok || !payload?.recipe) {
        setRecipeError(payload?.error ?? "Playlist Recipe could not be saved.");
        return;
      }

      setCurrentRecipe(payload.recipe);
      setRecipeName(payload.recipe.name);
      setRecipeNote(payload.recipe.playlistNote ?? "");
      setRecipeTags(formatRecipeTags(payload.recipe.tags));
      setRecipeTargetMax(
        payload.recipe.targetTrackMax ? payload.recipe.targetTrackMax.toString() : ""
      );
      setRecipeAllowExplicit(payload.recipe.allowExplicit);
      setRecipeLibraryOnly(payload.recipe.includeLibraryOnly);
      setRecipeMessage("Playlist Recipe saved.");
      router.refresh();
    } finally {
      setIsSavingRecipe(false);
    }
  }

  async function exportGeneration() {
    if (!generation) {
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportMessage(null);

    try {
      const response = await fetch(
        `/api/app/playlists/${encodeURIComponent(
          playlist.id
        )}/generations/${encodeURIComponent(generation.generation.id)}/export`,
        { method: "POST" }
      );
      const payload = (await response.json().catch(() => null)) as
        | {
            export?: {
              selectedTrackCount: number;
              jobId: string | null;
            };
            error?: string;
          }
        | null;

      if (!response.ok || !payload?.export) {
        setExportError(payload?.error ?? "Apple Music export failed.");
        return;
      }

      setExportMessage(
        `Apple Music export queued for ${payload.export.selectedTrackCount} approved tracks.`
      );
      setGeneration({
        ...generation,
        generation: {
          ...generation.generation,
          status: "exporting"
        }
      });
      setIsExportDialogOpen(false);
      router.refresh();
    } finally {
      setIsExporting(false);
    }
  }

  async function markReviewComplete() {
    if (!generation) {
      return;
    }

    setIsSavingReview(true);
    setDecisionError(null);
    setDecisionMessage(null);

    try {
      const response = await fetch(
        `/api/app/playlists/${encodeURIComponent(
          playlist.id
        )}/generations/${encodeURIComponent(generation.generation.id)}/tracks`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            markReviewed: true,
            decisions: generation.tracks.map((track) => ({
              trackId: track.id,
              decision: track.decision
            }))
          })
        }
      );
      const payload = (await response.json().catch(() => null)) as
        | { generation?: PlaylistGenerationView; error?: string }
        | null;

      if (!response.ok || !payload?.generation) {
        setDecisionError(payload?.error ?? "Track review could not be saved.");
        return;
      }

      setGeneration(payload.generation);
      setDecisionMessage("Review saved. Export is now available.");
      router.refresh();
    } finally {
      setIsSavingReview(false);
    }
  }

  async function archivePlaylist() {
    const confirmed = window.confirm(
      "Archive this app playlist? Apple Music playlists and library tracks will not be changed."
    );

    if (!confirmed) {
      return;
    }

    setIsArchiving(true);
    setArchiveError(null);

    try {
      const response = await fetch(`/api/app/playlists/${encodeURIComponent(playlist.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" })
      });
      const payload = (await response.json().catch(() => null)) as
        | { playlist?: PersistentPlaylist; error?: string }
        | null;

      if (!response.ok || !payload?.playlist) {
        setArchiveError(payload?.error ?? "Playlist could not be archived.");
        return;
      }

      router.push("/app/playlists");
      router.refresh();
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card elevated className="p-7">
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label={playlist.status}
              tone={playlist.status === "active" ? "success" : "pink"}
            />
            {playlist.applePlaylistId ? <StatusPill label="Exported" tone="success" /> : null}
          </div>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[0em] text-white">
            Playlist recipe
          </h2>
          <p className="mt-3 text-sm leading-7 text-platform-secondary">
            {playlist.description ?? "No playlist description saved yet."}
          </p>

          <form className="mt-6 space-y-5" onSubmit={saveRecipe}>
            <RecipeField label="Recipe name" htmlFor="playlist-recipe-name">
              <input
                id="playlist-recipe-name"
                required
                value={recipeName}
                onChange={(event) => setRecipeName(event.target.value)}
                className={recipeInputClassName}
              />
            </RecipeField>
            <RecipeField label="Instructions" htmlFor="playlist-recipe-note">
              <textarea
                id="playlist-recipe-note"
                value={recipeNote}
                onChange={(event) => setRecipeNote(event.target.value)}
                rows={4}
                className={recipeInputClassName}
                placeholder="Keep it energetic, modern, and avoid soft pop features."
              />
            </RecipeField>
            <RecipeField
              label="Tags"
              htmlFor="playlist-recipe-tags"
              hint="Use category:value pairs, separated by commas."
            >
              <input
                id="playlist-recipe-tags"
                value={recipeTags}
                onChange={(event) => setRecipeTags(event.target.value)}
                className={recipeInputClassName}
                placeholder="genre: rap, mood: hype, language: ukrainian"
              />
            </RecipeField>
            <div className="grid gap-3 sm:grid-cols-3">
              <RecipeField label="Target tracks" htmlFor="playlist-recipe-target">
                <input
                  id="playlist-recipe-target"
                  type="number"
                  min={1}
                  max={500}
                  value={recipeTargetMax}
                  onChange={(event) => setRecipeTargetMax(event.target.value)}
                  className={recipeInputClassName}
                />
              </RecipeField>
              <label className="flex min-h-11 items-center gap-3 rounded-[1.25rem] border border-white/10 bg-black/16 px-4 py-3 text-sm font-medium text-white sm:mt-7">
                <input
                  type="checkbox"
                  checked={recipeAllowExplicit}
                  onChange={(event) => setRecipeAllowExplicit(event.target.checked)}
                  className="h-5 w-5 accent-platform-pink"
                />
                Allow explicit
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-[1.25rem] border border-white/10 bg-black/16 px-4 py-3 text-sm font-medium text-white sm:mt-7">
                <input
                  type="checkbox"
                  checked={recipeLibraryOnly}
                  onChange={(event) => setRecipeLibraryOnly(event.target.checked)}
                  className="h-5 w-5 accent-platform-pink"
                />
                Library only
              </label>
            </div>
            {recipeError ? (
              <p className="rounded-[1rem] border border-[rgba(255,69,99,0.24)] bg-[rgba(255,69,99,0.10)] px-4 py-3 text-sm text-platform-danger">
                {recipeError}
              </p>
            ) : null}
            {recipeMessage ? (
              <p className="rounded-[1rem] border border-[rgba(47,212,133,0.24)] bg-[rgba(47,212,133,0.10)] px-4 py-3 text-sm text-platform-success">
                {recipeMessage}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSavingRecipe} className="min-w-36">
                {isSavingRecipe ? "Saving..." : "Save Recipe"}
              </Button>
              {currentRecipe ? (
                <StatusPill label={`Target ${formatTarget(currentRecipe)}`} tone="inverse" />
              ) : (
                <StatusPill label="Recipe required" tone="warning" />
              )}
            </div>
          </form>

          {generationError ? (
            <p className="mt-5 rounded-[1rem] border border-[rgba(255,69,99,0.24)] bg-[rgba(255,69,99,0.10)] px-4 py-3 text-sm text-platform-danger">
              {generationError}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              disabled={!currentRecipe || isGenerating}
              variant={!currentRecipe ? "disabled" : "primary"}
              onClick={async () => {
                setIsGenerating(true);
                setGenerationError(null);

                try {
                  const response = await fetch(
                    `/api/app/playlists/${encodeURIComponent(playlist.id)}/generate`,
                    { method: "POST" }
                  );
                  const payload = (await response.json().catch(() => null)) as
                    | { generation?: PlaylistGenerationView; error?: string }
                    | null;

                  if (!response.ok || !payload?.generation) {
                    setGenerationError(payload?.error ?? "Playlist could not be generated.");
                    return;
                  }

                  setGeneration(payload.generation);
                  router.refresh();
                } finally {
                  setIsGenerating(false);
                }
              }}
            >
              {isGenerating
                ? "Generating..."
                : hasGeneratedBefore
                  ? "Regenerate Playlist"
                  : "Generate Playlist"}
            </Button>
            <Link href="/app/playlists" className="inline-flex">
              <Button variant="glass">Back</Button>
            </Link>
          </div>
          <div className="mt-5 border-t border-white/10 pt-5">
            <p className="text-sm leading-6 text-platform-secondary">
              Archive only removes this saved playlist from the app workspace. Apple Music is not
              edited, deleted, reordered, or replaced.
            </p>
            {archiveError ? (
              <p className="mt-3 rounded-[1rem] border border-[rgba(255,69,99,0.24)] bg-[rgba(255,69,99,0.10)] px-4 py-3 text-sm text-platform-danger">
                {archiveError}
              </p>
            ) : null}
            <Button
              type="button"
              variant="danger"
              disabled={isArchiving}
              className="mt-3 min-w-36"
              onClick={archivePlaylist}
            >
              {isArchiving ? "Archiving..." : "Archive Playlist"}
            </Button>
          </div>
        </Card>

        <Card className="p-7">
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label={generation ? generation.generation.status.replaceAll("_", " ") : "Not generated"}
              tone={generation ? "warning" : "muted"}
            />
            {activeGenerationKind === "new_music" ? (
              <StatusPill label="New music suggestions" tone="success" />
            ) : null}
          </div>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[0em] text-white">
            {activeGenerationKind === "new_music"
              ? "Review new music suggestions"
              : "Review proposed tracks"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-platform-secondary">
            {activeGenerationKind === "new_music"
              ? "These tracks were suggested from your latest library sync. Edit every track before adding approved songs to Apple Music."
              : "Edit every track before Apple Music export. Removed tracks stay out of the approved list for this generation."}
          </p>
          <p className="mt-2 text-xs leading-6 text-platform-muted">
            Export creates an Apple Music playlist and adds approved tracks. It does not replace,
            reorder, or remove tracks from existing Apple Music playlists.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric label="Proposed" value={(generation?.tracks.length ?? 0).toString()} />
            <Metric label="Kept" value={keptCount.toString()} />
            <Metric label="Removed" value={removedCount.toString()} />
          </div>

          {decisionError ? (
            <p className="mt-5 rounded-[1rem] border border-[rgba(255,69,99,0.24)] bg-[rgba(255,69,99,0.10)] px-4 py-3 text-sm text-platform-danger">
              {decisionError}
            </p>
          ) : null}
          {decisionMessage ? (
            <p className="mt-5 rounded-[1rem] border border-[rgba(47,212,133,0.24)] bg-[rgba(47,212,133,0.10)] px-4 py-3 text-sm text-platform-success">
              {decisionMessage}
            </p>
          ) : null}

          <div className="mt-6">
            {generation && generation.tracks.length > 0 ? (
              <div className="overflow-hidden rounded-[1.25rem] border border-white/10">
                <table className="w-full border-collapse text-left text-sm">
                  <caption className="sr-only">Generated tracks for {playlist.name}</caption>
                  <thead className="bg-white/[0.055] text-xs uppercase tracking-[0.16em] text-platform-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Track
                      </th>
                      <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                        Reason
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        Decision
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {generation.tracks.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          item.decision === "remove" ? "bg-black/24 opacity-60" : "bg-black/12"
                        }
                      >
                        <th scope="row" className="px-4 py-3 font-medium text-white">
                          <span className="block">{item.track?.name ?? "Unknown track"}</span>
                          <span className="mt-1 block text-xs font-normal text-platform-secondary">
                            {item.track?.artistName ?? "Unknown artist"}
                          </span>
                        </th>
                        <td className="hidden max-w-md px-4 py-3 text-platform-secondary md:table-cell">
                          {item.reason ?? "Matched recipe tags."}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canEditTrackDecisions ? (
                            <Button
                              variant={item.decision === "keep" ? "danger" : "glass"}
                              className="min-w-28"
                              onClick={() =>
                                updateDecision({
                                  playlistId: playlist.id,
                                  generationId: generation.generation.id,
                                  trackId: item.id,
                                  decision: item.decision === "keep" ? "remove" : "keep",
                                  setDecisionError,
                                  setGeneration
                                })
                              }
                            >
                              {item.decision === "keep" ? "Remove" : "Restore"}
                            </Button>
                          ) : (
                            <StatusPill
                              label={item.decision === "keep" ? "Kept" : "Removed"}
                              tone={item.decision === "keep" ? "success" : "muted"}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-white/10 bg-black/16 p-5">
                <p className="text-sm leading-7 text-platform-secondary">
                  {generation
                    ? "No tracks matched this recipe. Complete review to clear this queue, then adjust the recipe and regenerate when ready."
                    : "Generate this playlist to review proposed tracks from your synced Apple Music library."}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <div>
              <p className="text-sm font-medium text-white">
                {canRetryExport
                  ? "Export failed"
                  : isReviewComplete
                    ? "Review saved"
                    : "Ready after review"}
              </p>
              <p className="mt-1 text-sm text-platform-secondary">
                {keptCount} approved {keptCount === 1 ? "track" : "tracks"} will be added.
              </p>
            </div>
            {exportError ? (
              <p className="mt-4 rounded-[1rem] border border-[rgba(255,69,99,0.24)] bg-[rgba(255,69,99,0.10)] px-4 py-3 text-sm text-platform-danger">
                {exportError}
              </p>
            ) : null}
            {exportMessage ? (
              <p className="mt-4 rounded-[1rem] border border-[rgba(47,212,133,0.24)] bg-[rgba(47,212,133,0.10)] px-4 py-3 text-sm text-platform-success">
                {exportMessage}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={
                  !generation ||
                  isReviewComplete ||
                  isSavingReview
                }
                variant={!generation || isReviewComplete ? "disabled" : "glass"}
                className="min-w-48"
                onClick={markReviewComplete}
              >
                {isSavingReview
                  ? "Saving Review..."
                  : isReviewComplete
                    ? "Review Saved"
                    : "Mark Review Complete"}
              </Button>
              <Button
                disabled={!canExport || isExporting}
                variant={!canExport ? "disabled" : "primary"}
                className="min-w-56"
                onClick={() => setIsExportDialogOpen(true)}
              >
                {isExporting
                  ? "Exporting..."
                  : canRetryExport
                    ? "Retry Apple Music export"
                    : "Create Apple Music playlist"}
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <PlaylistExportConfirmationDialog
        isOpen={isExportDialogOpen}
        playlistName={playlist.name}
        approvedTrackCount={keptCount}
        isSubmitting={isExporting}
        errorMessage={exportError}
        onClose={() => setIsExportDialogOpen(false)}
        onConfirm={exportGeneration}
      />

      <details className="rounded-[1.5rem] border border-platform-border bg-platform-card p-6">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4">
          <span>
            <span className="block font-display text-2xl font-semibold tracking-[0em] text-white">
              Generation history
            </span>
            <span className="mt-2 block max-w-3xl text-sm leading-7 text-platform-secondary">
              Regenerate this playlist anytime. Previous generation records stay visible so users
              can see when the recipe last produced tracks.
            </span>
          </span>
          <StatusPill
            label={`${generationHistory.length} ${generationHistory.length === 1 ? "run" : "runs"}`}
            tone="inverse"
          />
        </summary>

        {generationHistory.length > 0 ? (
          <ol className="mt-5 grid gap-3">
            {generationHistory.map((item) => (
              <li
                key={item.generation.id}
                className="grid gap-3 rounded-[1.25rem] border border-white/10 bg-black/16 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {formatDateTime(item.generation.generatedAt ?? item.generation.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-platform-secondary">
                    {item.trackCount === null
                      ? "Track count unavailable"
                      : `${item.trackCount} proposed ${item.trackCount === 1 ? "track" : "tracks"}`}
                  </p>
                </div>
                <StatusPill
                  label={
                    getGenerationKind(item.generation.recipeSnapshot) === "new_music"
                      ? "new music"
                      : item.generation.status.replaceAll("_", " ")
                  }
                  tone={item.generation.status === "exported" ? "success" : "warning"}
                />
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-5 rounded-[1.25rem] border border-white/10 bg-black/16 p-4 text-sm leading-7 text-platform-secondary">
            No generations yet. Generate this playlist to create the first reviewable version.
          </p>
        )}
      </details>
    </div>
  );
}

export function PlaylistExportConfirmationDialog({
  isOpen,
  playlistName,
  approvedTrackCount,
  isSubmitting = false,
  errorMessage,
  onClose,
  onConfirm
}: {
  isOpen: boolean;
  playlistName: string;
  approvedTrackCount: number;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { onDialogKeyDown } = useDialogAccessibility({
    isOpen,
    dialogRef,
    onClose,
    closeDisabled: isSubmitting
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="playlist-export-confirmation-title"
      aria-describedby="playlist-export-confirmation-description"
      tabIndex={-1}
      onKeyDown={onDialogKeyDown}
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-sm"
    >
      <Card elevated className="w-full max-w-lg space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            Explicit confirmation required
          </p>
          <h2
            id="playlist-export-confirmation-title"
            className="mt-2 font-display text-2xl font-semibold tracking-[0em] text-white"
          >
            Create Apple Music playlist?
          </h2>
          <p
            id="playlist-export-confirmation-description"
            className="mt-3 text-sm leading-7 text-platform-secondary"
          >
            Export {playlistName} and add {approvedTrackCount} approved{" "}
            {approvedTrackCount === 1 ? "track" : "tracks"} from your review.
          </p>
        </div>

        <p className="rounded-2xl border border-[rgba(255,77,109,0.28)] bg-[rgba(255,77,109,0.10)] p-4 text-sm leading-6 text-platform-secondary">
          Organize Your Music will create an app-managed Apple Music playlist and add only
          approved tracks. Existing Apple Music playlists will not be replaced, reordered, or
          removed.
        </p>

        {errorMessage ? (
          <p className="rounded-2xl border border-[rgba(255,77,109,0.28)] bg-[rgba(255,77,109,0.10)] p-4 text-sm text-platform-danger">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting || approvedTrackCount === 0}>
            {isSubmitting ? "Queueing..." : "Create Apple Music playlist"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-black/16 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-platform-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white">{value}</p>
    </div>
  );
}

function getGenerationKind(recipeSnapshot: Record<string, unknown> | undefined) {
  return recipeSnapshot?.source === "new_music" ? "new_music" : "playlist";
}

const recipeInputClassName =
  "mt-2 w-full min-w-0 rounded-[1rem] border border-white/10 bg-black/24 px-4 py-3 text-sm text-white outline-none transition placeholder:text-platform-muted focus:border-platform-pink focus:ring-2 focus:ring-platform-pink/25";

function RecipeField({
  label,
  htmlFor,
  hint,
  children
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="text-sm font-medium text-white">
        {label}
      </label>
      {hint ? <p className="mt-1 text-xs leading-5 text-platform-muted">{hint}</p> : null}
      {children}
    </div>
  );
}

function formatTarget(recipe: PlaylistRecipe) {
  if (recipe.targetTrackMin && recipe.targetTrackMax) {
    return `${recipe.targetTrackMin}-${recipe.targetTrackMax} tracks`;
  }

  if (recipe.targetTrackMax) {
    return `Up to ${recipe.targetTrackMax} tracks`;
  }

  if (recipe.targetTrackMin) {
    return `At least ${recipe.targetTrackMin} tracks`;
  }

  return "No target";
}

const recipeTagCategories = new Set<PlaylistRecipeTagCategory>([
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

function formatRecipeTags(tags: PlaylistRecipeTag[]) {
  return tags.map((tag) => `${tag.category}: ${tag.value}`).join(", ");
}

function parseRecipeTags(value: string): PlaylistRecipeTag[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((item) => {
      const [rawCategory, ...rest] = item.split(":");
      const maybeCategory = normalizeRecipeTagCategory(rawCategory);
      const tagValue = maybeCategory ? rest.join(":").trim() : item;
      const category = maybeCategory ?? "custom";

      return {
        id: `tag_${category}_${tagValue.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        category,
        value: tagValue || item
      };
    });
}

function normalizeRecipeTagCategory(value: string): PlaylistRecipeTagCategory | null {
  const normalized = value.trim().toLowerCase().replaceAll(" ", "_");

  return recipeTagCategories.has(normalized as PlaylistRecipeTagCategory)
    ? (normalized as PlaylistRecipeTagCategory)
    : null;
}

function parseTargetTrackCount(value: string) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

async function updateDecision(input: {
  playlistId: string;
  generationId: string;
  trackId: string;
  decision: PlaylistTrackDecision;
  setDecisionError: (value: string | null) => void;
  setGeneration: (value: PlaylistGenerationView) => void;
}) {
  input.setDecisionError(null);
  const response = await fetch(
    `/api/app/playlists/${encodeURIComponent(input.playlistId)}/generations/${encodeURIComponent(
      input.generationId
    )}/tracks`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decisions: [
          {
            trackId: input.trackId,
            decision: input.decision
          }
        ]
      })
    }
  );
  const payload = (await response.json().catch(() => null)) as
    | { generation?: PlaylistGenerationView; error?: string }
    | null;

  if (!response.ok || !payload?.generation) {
    input.setDecisionError(payload?.error ?? "Track decision could not be saved.");
    return;
  }

  input.setGeneration(payload.generation);
}
