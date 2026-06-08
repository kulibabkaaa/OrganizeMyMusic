import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabasePlaylistRecipeStore } from "@/modules/playlist-recipes/store";
import { createSupabasePlaylistGenerationStore } from "@/modules/playlists/generation-store";
import { createSupabasePlaylistStore } from "@/modules/playlists/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ playlistId: string }> }
) {
  const contextResult = await getPlaylistItemRouteContext(context);

  if (contextResult instanceof NextResponse) {
    return contextResult;
  }

  const { generationStore, playlist, recipeStore, session } = contextResult;
  const [recipes, latestGeneration, generationHistory] = await Promise.all([
    recipeStore.listRecipesForPlaylist({
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

  return NextResponse.json({
    playlist,
    recipe: recipes[0] ?? null,
    latestGeneration,
    generationHistory
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ playlistId: string }> }
) {
  const contextResult = await getPlaylistItemRouteContext(context);

  if (contextResult instanceof NextResponse) {
    return contextResult;
  }

  try {
    const { playlist, playlistStore, session } = contextResult;
    const updatedPlaylist = await playlistStore.updatePlaylist({
      userId: session.user.id,
      playlistId: playlist.id,
      values: await request.json().catch(() => null)
    });

    if (!updatedPlaylist) {
      return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
    }

    return NextResponse.json({ playlist: updatedPlaylist });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid playlist payload." }, { status: 400 });
    }

    throw error;
  }
}

async function getPlaylistItemRouteContext(context: {
  params: Promise<{ playlistId: string }>;
}) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json({ error: "Playlist storage is not configured." }, { status: 503 });
  }

  const { playlistId } = await context.params;
  const playlistStore = createSupabasePlaylistStore(supabase);
  const playlist = await playlistStore.getPlaylist({
    userId: session.user.id,
    playlistId
  });

  if (!playlist) {
    return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
  }

  return {
    session,
    playlist,
    playlistStore,
    generationStore: createSupabasePlaylistGenerationStore(supabase),
    recipeStore: createSupabasePlaylistRecipeStore(supabase)
  };
}
