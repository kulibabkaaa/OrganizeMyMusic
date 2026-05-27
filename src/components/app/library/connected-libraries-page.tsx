import React from "react";

import { AppShell } from "@/components/app/app-shell";
import { AppleMusicLibraryCard } from "@/components/app/library/apple-music-library-card";
import { ComingSoonProviderCard } from "@/components/app/library/coming-soon-provider-card";
import { Card } from "@/components/ui/card";
import type {
  AppleMusicConnectionSummary,
  LibrarySyncSummary
} from "@/modules/library-syncs/queue";

export function ConnectedLibrariesPage({
  appleMusicConnection,
  latestSync
}: {
  appleMusicConnection: AppleMusicConnectionSummary | null;
  latestSync: LibrarySyncSummary | null;
}) {
  return (
    <AppShell
      title="Connected libraries"
      subtitle="Manage provider access, sync status, and reconnect flows from the platform settings area."
    >
      <section className="grid gap-5 lg:grid-cols-3">
        <AppleMusicLibraryCard
          appleMusicConnection={appleMusicConnection}
          latestSync={latestSync}
        />
        <ComingSoonProviderCard name="Spotify" />
        <ComingSoonProviderCard name="YouTube Music" />
      </section>

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
