import React from "react";

import { AppShell } from "@/components/app/app-shell";
import { AppleMusicLibraryCard } from "@/components/app/library/apple-music-library-card";
import { NewMusicCard } from "@/components/app/library/new-music-card";
import { Card } from "@/components/ui/card";
import type { NewMusicSummary } from "@/modules/library-syncs/new-music";
import type {
  AppleMusicConnectionSummary,
  LibrarySyncSummary
} from "@/modules/library-syncs/queue";

export function ConnectedLibrariesPage({
  appleMusicConnection,
  latestSync,
  newMusicSummary = null
}: {
  appleMusicConnection: AppleMusicConnectionSummary | null;
  latestSync: LibrarySyncSummary | null;
  newMusicSummary?: NewMusicSummary | null;
}) {
  return (
    <AppShell
      title="Connected libraries"
      subtitle="Manage provider access, sync status, and reconnect flows from the platform settings area."
    >
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
        <AppleMusicLibraryCard
          appleMusicConnection={appleMusicConnection}
          latestSync={latestSync}
        />
        <Card as="section" className="min-h-64">
          <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
            Apple Music only for MVP
          </h2>
          <p className="mt-3 text-sm leading-7 text-platform-secondary">
            This workspace only manages Apple Music libraries and app-created Apple Music
            playlists while the core organizer flow is being verified.
          </p>
        </Card>
      </section>

      <NewMusicCard summary={newMusicSummary} />

      <Card as="section" className="mt-6">
        <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
          Access notes
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-platform-secondary">
          Organize Your Music reads library metadata to classify tracks. Playlist creation requires
          your review and explicit export action.
        </p>
      </Card>
    </AppShell>
  );
}
