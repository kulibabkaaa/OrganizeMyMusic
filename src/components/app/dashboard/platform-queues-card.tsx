import React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { NewMusicSummary } from "@/modules/library-syncs/new-music";
import type { PersistentPlaylist } from "@/types/domain";

export function PlatformQueuesCard({
  playlists,
  reviewQueueCount,
  newMusicSummary
}: {
  playlists: PersistentPlaylist[];
  reviewQueueCount: number;
  newMusicSummary: NewMusicSummary | null;
}) {
  return (
    <Card className="mt-6 p-7">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <StatusPill label="Platform workspace" tone="success" />
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[0em] text-white">
            Saved playlists and queues
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-platform-secondary">
            After the first full organization, return here to manage saved playlists, review
            generated tracks, and process newly synced music.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/app/playlists" className="inline-flex">
            <Button variant="glass">Open Playlists</Button>
          </Link>
          <Link href="/app/playlists/new" className="inline-flex">
            <Button variant="glass">Create Playlist</Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <QueueMetric
          label="Saved playlists"
          value={playlists.length.toString()}
          detail={playlists.length === 1 ? "1 app-created playlist" : "app-created playlists"}
          actionLabel="Open Playlists"
          href="/app/playlists"
        />
        <QueueMetric
          label="Review queue"
          value={reviewQueueCount.toString()}
          detail="generations waiting for track review"
          actionLabel={reviewQueueCount > 0 ? "Review Tracks" : "Open Playlists"}
          href={reviewQueueCount > 0 ? "/app/playlists?focus=review" : "/app/playlists"}
        />
        <QueueMetric
          label="New music queue"
          value={(newMusicSummary?.newTrackCount ?? 0).toString()}
          detail={newMusicSummary?.message ?? "Complete a sync to detect new songs."}
          actionLabel={newMusicSummary?.canProcess ? "Process New Music" : "Open Library"}
          href="/app/library#new-music"
        />
      </div>
    </Card>
  );
}

function QueueMetric({
  label,
  value,
  detail,
  actionLabel,
  href
}: {
  label: string;
  value: string;
  detail: string;
  actionLabel: string;
  href: React.ComponentProps<typeof Link>["href"];
}) {
  return (
    <article className="flex min-h-48 flex-col rounded-[1.25rem] border border-white/10 bg-black/16 p-4">
      <div className="flex-1">
        <p className="text-xs uppercase tracking-[0.16em] text-platform-muted">{label}</p>
        <p className="mt-2 font-display text-4xl font-semibold tracking-[0em] text-white">
          {value}
        </p>
        <p className="mt-2 text-sm leading-6 text-platform-secondary">{detail}</p>
      </div>
      <Link href={href} className="mt-4 inline-flex">
        <Button variant="glass" className="min-h-11 min-w-36">
          {actionLabel}
        </Button>
      </Link>
    </article>
  );
}
