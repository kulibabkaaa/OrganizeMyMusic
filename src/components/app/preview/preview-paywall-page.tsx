import React from "react";

import { PlaylistPreviewCard } from "@/components/app/preview/playlist-preview-card";
import { UnlockSortCard } from "@/components/app/preview/unlock-sort-card";
import { WorkflowEscapeActions } from "@/components/app/workflow-escape-actions";
import { Card } from "@/components/ui/card";
import type { LightweightPreviewSnapshot } from "@/modules/sorts/lightweight-preview";

export function PreviewPaywallPage({
  sortName,
  snapshot
}: {
  sortName: string;
  snapshot: LightweightPreviewSnapshot;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            Lightweight estimate
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white md:text-4xl">
            Preview your Sort
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            See likely playlist shape before payment. Full sorting, editing, and export unlock after checkout.
          </p>
          <WorkflowEscapeActions
            sortId={snapshot.sortRunId}
            showBuilderLink
            className="mt-4"
          />
        </div>
        <p className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-platform-secondary">
          {sortName}
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          {snapshot.playlists.length > 0 ? (
            snapshot.playlists.map((playlist) => (
              <PlaylistPreviewCard key={playlist.id} playlist={playlist} />
            ))
          ) : (
            <Card>
              <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
                No preview rows yet
              </h2>
              <p className="mt-2 text-sm leading-7 text-platform-secondary">
                Add Playlist Recipes and generate preview again.
              </p>
            </Card>
          )}
        </div>
        <UnlockSortCard sortId={snapshot.sortRunId} playlistCount={snapshot.playlists.length} />
      </section>
    </div>
  );
}
