import { redirect } from "next/navigation";

import { PlaylistsPage } from "@/components/app/playlists/playlists-page";
import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
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

  if (serviceSupabase) {
    await ensureProfileForUser(serviceSupabase, session.user);

    try {
      playlists = await createSupabasePlaylistStore(serviceSupabase).listPlaylists({
        userId: session.user.id
      });
    } catch {
      playlists = [];
    }
  }

  return <PlaylistsPage playlists={playlists} />;
}
