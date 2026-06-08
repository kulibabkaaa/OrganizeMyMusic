import React from "react";
import Link from "next/link";

import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import type { PersistentPlaylist, PlaylistStatus } from "@/types/domain";

export function PlaylistsPage({ playlists }: { playlists: PersistentPlaylist[] }) {
  return (
    <AppShell
      title="Playlists"
      subtitle="Saved app-created playlists with recipes, generated track proposals, review, and Apple Music export."
    >
      <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            Saved playlist system
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white md:text-4xl">
            Build playlists from your library
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            Define the playlist, keep the recipe simple, generate proposed tracks, review every
            track, then export approved tracks to Apple Music.
          </p>
        </div>
        <Link href="/app/playlists/new" className="inline-flex">
          <Button className="min-w-40">Create Playlist</Button>
        </Link>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Saved playlists" value={playlists.length.toString()} />
        <MetricCard
          label="Ready to manage"
          value={playlists.filter((playlist) => playlist.status === "active").length.toString()}
        />
        <MetricCard
          label="Apple Music exports"
          value={playlists.filter((playlist) => playlist.applePlaylistId).length.toString()}
        />
      </section>

      <Card as="section" className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusPill label="MVP safety" tone="warning" />
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-[0em] text-white">
              App-created playlists only
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-platform-secondary">
              The MVP manages playlists created here. Existing Apple Music playlists stay untouched
              unless the user explicitly exports approved tracks through this app.
            </p>
          </div>
          <Link href="/app/sorts/new" className="inline-flex">
            <Button variant="glass">Organize My Library</Button>
          </Link>
        </div>
      </Card>

      <section className="mt-6">
        {playlists.length === 0 ? (
          <EmptyState
            title="No saved playlists yet"
            description="Create a playlist idea, add a recipe, generate proposed tracks, then review the result before export."
            action={
              <Link href="/app/playlists/new" className="inline-flex">
                <Button variant="glass">Create Playlist</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function PlaylistCard({ playlist }: { playlist: PersistentPlaylist }) {
  return (
    <Card as="article" className="min-h-64">
      <div className="flex items-start justify-between gap-3">
        <StatusPill label={formatStatus(playlist.status)} tone={getStatusTone(playlist.status)} />
        {playlist.applePlaylistId ? <StatusPill label="Exported" tone="success" /> : null}
      </div>
      <h3 className="mt-4 break-words font-display text-2xl font-semibold tracking-[0em] text-white">
        {playlist.name}
      </h3>
      <p className="mt-2 min-h-14 text-sm leading-7 text-platform-secondary">
        {playlist.description ?? "No description yet."}
      </p>
      <dl className="mt-5 grid gap-3 text-sm text-platform-secondary">
        <MetaRow label="Last generated" value={formatDate(playlist.lastGeneratedAt)} />
        <MetaRow label="Last exported" value={formatDate(playlist.lastExportedAt)} />
      </dl>
      <Link href={`/app/playlists/${playlist.id}`} className="mt-5 inline-flex">
        <Button variant="glass" className="min-w-32">
          Open
        </Button>
      </Link>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card as="article" className="min-h-32">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
        {label}
      </p>
      <p className="mt-3 font-display text-4xl font-semibold tracking-[0em] text-white">{value}</p>
    </Card>
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

function getStatusTone(status: PlaylistStatus) {
  if (status === "active") return "success";
  if (status === "archived") return "muted";
  return "pink";
}

function formatStatus(status: PlaylistStatus) {
  return status.replaceAll("_", " ");
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
