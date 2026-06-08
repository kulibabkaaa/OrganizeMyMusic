import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { playlistRecipeCreateSchema, playlistRecipeUpdateSchema } from "@/modules/playlist-recipes/schema";
import { createSupabasePlaylistRecipeStore } from "@/modules/playlist-recipes/store";
import { createSupabasePlaylistStore } from "@/modules/playlists/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ playlistId: string }> }
) {
  const contextResult = await getPlaylistRecipeRouteContext(context);

  if (contextResult instanceof NextResponse) {
    return contextResult;
  }

  const { playlist, recipeStore, session } = contextResult;

  if (playlist.status === "archived") {
    return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
  }

  const recipes = await recipeStore.listRecipesForPlaylist({
    userId: session.user.id,
    playlistId: playlist.id
  });

  return NextResponse.json({ recipe: recipes[0] ?? null });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ playlistId: string }> }
) {
  const contextResult = await getPlaylistRecipeRouteContext(context);

  if (contextResult instanceof NextResponse) {
    return contextResult;
  }

  try {
    const { playlist, recipeStore, session } = contextResult;

    if (playlist.status === "archived") {
      return NextResponse.json(
        { error: "Archived playlists cannot be edited." },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => null);
    const recipes = await recipeStore.listRecipesForPlaylist({
      userId: session.user.id,
      playlistId: playlist.id
    });
    const existingRecipe = recipes[0] ?? null;

    if (existingRecipe) {
      const values = playlistRecipeUpdateSchema.parse(body);
      const recipe = await recipeStore.updateRecipe({
        userId: session.user.id,
        recipeId: existingRecipe.id,
        values
      });

      return NextResponse.json({ recipe });
    }

    const recipe = playlistRecipeCreateSchema.parse({
      ...(typeof body === "object" && body ? body : {}),
      playlistId: playlist.id,
      sortRunId: null,
      position: 0
    });

    return NextResponse.json(
      {
        recipe: await recipeStore.createRecipe({
          userId: session.user.id,
          recipe
        })
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid Playlist Recipe payload." }, { status: 400 });
    }

    throw error;
  }
}

async function getPlaylistRecipeRouteContext(context: {
  params: Promise<{ playlistId: string }>;
}) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Playlist Recipe storage is not configured." },
      { status: 503 }
    );
  }

  const { playlistId } = await context.params;
  const playlist = await createSupabasePlaylistStore(supabase).getPlaylist({
    userId: session.user.id,
    playlistId
  });

  if (!playlist) {
    return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
  }

  return {
    session,
    playlist,
    recipeStore: createSupabasePlaylistRecipeStore(supabase)
  };
}
