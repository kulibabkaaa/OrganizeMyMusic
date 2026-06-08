import { redirect } from "next/navigation";

import {
  PlaylistsPage,
  type PlaylistCardGenerationSummary
} from "@/components/app/playlists/playlists-page";
import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabasePlaylistGenerationStore } from "@/modules/playlists/generation-store";
import { createSupabasePlaylistStore } from "@/modules/playlists/store";
import type { PersistentPlaylist } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function AppPlaylistsPage() {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    redirect("/auth");
  }

  const serviceSupabase = createSupabaseServiceRoleClient();
  let playlists: PersistentPlaylist[] = [];
  let generationSummariesByPlaylistId: Record<
    string,
    PlaylistCardGenerationSummary | undefined
  > = {};

  if (serviceSupabase) {
    await ensureProfileForUser(serviceSupabase, session.user);

    try {
      playlists = await createSupabasePlaylistStore(serviceSupabase).listPlaylists({
        userId: session.user.id
      });
      const generationStore = createSupabasePlaylistGenerationStore(serviceSupabase);
      const summaries = await Promise.all(
        playlists.map(async (playlist) => {
          const [latest] = await generationStore.listGenerationHistory({
            userId: session.user.id,
            playlistId: playlist.id,
            limit: 1
          });

          return [
            playlist.id,
            latest
              ? {
                  status: latest.generation.status,
                  trackCount: latest.trackCount,
                  generatedAt: latest.generation.generatedAt
                }
              : undefined
          ] as const;
        })
      );
      generationSummariesByPlaylistId = Object.fromEntries(summaries);
    } catch {
      playlists = [];
      generationSummariesByPlaylistId = {};
    }
  }

  return (
    <PlaylistsPage
      playlists={playlists}
      generationSummariesByPlaylistId={generationSummariesByPlaylistId}
    />
  );
}
