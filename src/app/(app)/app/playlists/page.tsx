import { redirect } from "next/navigation";

import {
  PlaylistsPage,
  parsePlaylistsPageFocus
} from "@/components/app/playlists/playlists-page";
import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  listLatestPlaylistGenerationSummaries,
  type PlaylistCardGenerationSummary
} from "@/modules/playlists/latest-generation-summaries";
import { createSupabasePlaylistGenerationStore } from "@/modules/playlists/generation-store";
import { createSupabasePlaylistStore } from "@/modules/playlists/store";
import type { PersistentPlaylist } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function AppPlaylistsPage({
  searchParams
}: {
  searchParams: Promise<{ focus?: string | string[] }>;
}) {
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
      generationSummariesByPlaylistId = await listLatestPlaylistGenerationSummaries({
        store: createSupabasePlaylistGenerationStore(serviceSupabase),
        userId: session.user.id,
        playlists
      });
    } catch {
      playlists = [];
      generationSummariesByPlaylistId = {};
    }
  }

  const { focus } = await searchParams;

  return (
    <PlaylistsPage
      playlists={playlists}
      generationSummariesByPlaylistId={generationSummariesByPlaylistId}
      focus={parsePlaylistsPageFocus(focus)}
    />
  );
}
