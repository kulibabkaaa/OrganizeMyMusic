import React from "react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { TagChip } from "@/components/ui/tag-chip";
import { getTagCategoryLabel } from "@/modules/playlist-recipes/tags";
import type { LightweightPreviewPlaylist } from "@/modules/sorts/lightweight-preview";

export function PlaylistPreviewCard({
  playlist
}: {
  playlist: LightweightPreviewPlaylist;
}) {
  return (
    <Card as="article" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <StatusPill label={formatFitLabel(playlist.fitLabel)} tone={getFitTone(playlist.fitLabel)} />
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-[0em] text-white">
            {playlist.playlistName}
          </h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-sm text-platform-secondary">
          {playlist.estimatedTrackCount} estimated tracks
        </span>
      </div>

      <div className="flex flex-wrap gap-2" aria-label={`${playlist.playlistName} tags`}>
        {playlist.tags.map((tag) => (
          <TagChip
            key={tag.id}
            label={`${getTagCategoryLabel(tag.category)}: ${tag.value}`}
            tone="pink"
            noteLabel={tag.note ? "Tag note saved" : undefined}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">Preview samples for {playlist.playlistName}</caption>
          <tbody className="divide-y divide-white/10">
            {playlist.sampleTracks.map((track) => (
              <tr key={`${track.fingerprint}_${track.position}`} className="bg-white/[0.03]">
                <td className="px-4 py-3">
                  <p className="truncate font-semibold text-white">{track.name ?? "Untitled track"}</p>
                  <p className="mt-1 truncate text-xs text-platform-muted">{track.reason}</p>
                </td>
                <td className="px-4 py-3 text-platform-secondary">
                  {track.artistName ?? "Unknown artist"}
                </td>
              </tr>
            ))}
            {playlist.lockedTrackCount > 0 ? (
              <tr className="bg-black/20">
                <td className="px-4 py-3 text-platform-muted">
                  {playlist.lockedTrackCount} locked matches
                </td>
                <td className="px-4 py-3 text-platform-muted">Unlock full Sort</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {playlist.qualityWarnings?.length ? (
        <div
          className="rounded-2xl border border-[rgba(255,176,32,0.24)] bg-[rgba(255,176,32,0.08)] p-4"
          role="status"
          aria-label={`${playlist.playlistName} sorting warnings`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-platform-warning">
            Sorting warnings
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-platform-secondary">
            {playlist.qualityWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-platform-muted">
            Adjust this playlist plan before checkout if these warnings look wrong.
          </p>
        </div>
      ) : null}

      <p className="text-sm text-platform-secondary">
        Preview only. Final results are generated after checkout.
      </p>
    </Card>
  );
}

function formatFitLabel(value: LightweightPreviewPlaylist["fitLabel"]) {
  if (value === "strong") {
    return "Strong fit";
  }

  if (value === "limited") {
    return "Limited fit";
  }

  return "No matches";
}

function getFitTone(value: LightweightPreviewPlaylist["fitLabel"]) {
  if (value === "strong") {
    return "success" as const;
  }

  if (value === "limited") {
    return "warning" as const;
  }

  return "danger" as const;
}
