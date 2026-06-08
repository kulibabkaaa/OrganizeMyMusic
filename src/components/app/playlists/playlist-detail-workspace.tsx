"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  PlaylistGenerationHistoryItem,
  PlaylistGenerationView
} from "@/modules/playlists/generation-store";
import type { PersistentPlaylist, PlaylistRecipe, PlaylistTrackDecision } from "@/types/domain";

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
  const [generation, setGeneration] = useState(latestGeneration);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const keptCount = useMemo(
    () => generation?.tracks.filter((track) => track.decision === "keep").length ?? 0,
    [generation]
  );
  const removedCount = (generation?.tracks.length ?? 0) - keptCount;
  const canExport =
    Boolean(generation) &&
    keptCount > 0 &&
    generation?.generation.status !== "exporting" &&
    generation?.generation.status !== "exported";
  async function exportGeneration() {
    if (!generation) {
      return;
    }

    const confirmed = window.confirm(
      `Create an Apple Music playlist and add ${keptCount} approved tracks?`
    );

    if (!confirmed) {
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
      router.refresh();
    } finally {
      setIsExporting(false);
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

          {recipe ? (
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
                  Instructions
                </p>
                <p className="mt-2 text-sm leading-7 text-white">
                  {recipe.playlistNote ?? "No extra instructions."}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
                  Tags
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recipe.tags.length > 0 ? (
                    recipe.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-xs text-white"
                      >
                        {tag.category}: {tag.value}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-platform-secondary">No tags saved.</span>
                  )}
                </div>
              </div>
              <dl className="grid gap-3 rounded-[1.25rem] border border-white/10 bg-black/16 p-4 text-sm text-platform-secondary">
                <MetaRow label="Target" value={formatTarget(recipe)} />
                <MetaRow label="Explicit" value={recipe.allowExplicit ? "Allowed" : "Blocked"} />
                <MetaRow label="Library only" value={recipe.includeLibraryOnly ? "Yes" : "No"} />
              </dl>
            </div>
          ) : (
            <p className="mt-6 rounded-[1.25rem] border border-white/10 bg-black/16 p-4 text-sm leading-7 text-platform-secondary">
              Save a recipe before generating this playlist.
            </p>
          )}

          {generationError ? (
            <p className="mt-5 rounded-[1rem] border border-[rgba(255,69,99,0.24)] bg-[rgba(255,69,99,0.10)] px-4 py-3 text-sm text-platform-danger">
              {generationError}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              disabled={!recipe || isGenerating}
              variant={!recipe ? "disabled" : "primary"}
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
              {isGenerating ? "Generating..." : "Generate Playlist"}
            </Button>
            <Link href="/app/playlists" className="inline-flex">
              <Button variant="glass">Back</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-7">
          <StatusPill
            label={generation ? generation.generation.status.replaceAll("_", " ") : "Not generated"}
            tone={generation ? "warning" : "muted"}
          />
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[0em] text-white">
            Review proposed tracks
          </h2>
          <p className="mt-3 text-sm leading-7 text-platform-secondary">
            Edit every track before Apple Music export. Removed tracks stay out of the approved
            list for this generation.
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
                        className={item.decision === "remove" ? "bg-black/24 opacity-60" : "bg-black/12"}
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-white/10 bg-black/16 p-5">
                <p className="text-sm leading-7 text-platform-secondary">
                  Generate this playlist to review proposed tracks from your synced Apple Music
                  library.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <div>
              <p className="text-sm font-medium text-white">Ready after review</p>
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
            <Button
              disabled={!canExport || isExporting}
              variant={!canExport ? "disabled" : "primary"}
              className="min-w-56"
              onClick={exportGeneration}
            >
              {isExporting ? "Exporting..." : "Create Apple Music playlist"}
            </Button>
          </div>
        </Card>
      </section>

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
                  label={item.generation.status.replaceAll("_", " ")}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-black/16 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-platform-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white">{value}</p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right text-white">{value}</dd>
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
