import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { PlaylistDetailWorkspace } from "@/components/app/playlists/playlist-detail-workspace";
import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabasePlaylistRecipeStore } from "@/modules/playlist-recipes/store";
import { createSupabasePlaylistGenerationStore } from "@/modules/playlists/generation-store";
import { createSupabasePlaylistStore } from "@/modules/playlists/store";

export const dynamic = "force-dynamic";

export default async function PlaylistDetailPage({
  params
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    redirect("/auth");
  }

  const { playlistId } = await params;
  const serviceSupabase = createSupabaseServiceRoleClient();

  if (!serviceSupabase) {
    notFound();
  }

  await ensureProfileForUser(serviceSupabase, session.user);
  const playlist = await createSupabasePlaylistStore(serviceSupabase).getPlaylist({
    userId: session.user.id,
    playlistId
  });

  if (!playlist || playlist.status === "archived") {
    notFound();
  }

  const generationStore = createSupabasePlaylistGenerationStore(serviceSupabase);
  const [recipes, latestGeneration, generationHistory] = await Promise.all([
    createSupabasePlaylistRecipeStore(serviceSupabase).listRecipesForPlaylist({
      userId: session.user.id,
      playlistId: playlist.id
    }),
    generationStore.getLatestGeneration({
      userId: session.user.id,
      playlistId: playlist.id
    }),
    generationStore.listGenerationHistory({
      userId: session.user.id,
      playlistId: playlist.id
    })
  ]);

  return (
    <AppShell
      title={playlist.name}
      subtitle="Recipe, generation, review, and export controls for this app-created playlist."
    >
      <PlaylistDetailWorkspace
        playlist={playlist}
        recipe={recipes[0] ?? null}
        latestGeneration={latestGeneration}
        generationHistory={generationHistory}
      />
    </AppShell>
  );
}
