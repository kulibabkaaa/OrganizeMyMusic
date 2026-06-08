import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { playlistRecipeUpdateSchema } from "@/modules/playlist-recipes/schema";
import { createSupabasePlaylistRecipeStore } from "@/modules/playlist-recipes/store";
import { createSupabaseSortDraftStore } from "@/modules/sorts/drafts";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sortId: string; recipeId: string }> }
) {
  const contextResult = await getRecipeItemRouteContext(context);

  if (contextResult instanceof NextResponse) {
    return contextResult;
  }

  try {
    const { recipeId, recipeStore, session } = contextResult;
    const values = playlistRecipeUpdateSchema.parse(await request.json().catch(() => null));
    const recipe = await recipeStore.updateRecipe({
      userId: session.user.id,
      recipeId,
      values
    });

    if (!recipe) {
      return NextResponse.json({ error: "Playlist Recipe not found." }, { status: 404 });
    }

    return NextResponse.json({ recipe });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid Playlist Recipe payload." }, { status: 400 });
    }

    throw error;
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sortId: string; recipeId: string }> }
) {
  const contextResult = await getRecipeItemRouteContext(context);

  if (contextResult instanceof NextResponse) {
    return contextResult;
  }

  const { recipeId, recipeStore, session } = contextResult;
  await recipeStore.deleteRecipe({
    userId: session.user.id,
    recipeId
  });

  return NextResponse.json({ deleted: true });
}

async function getRecipeItemRouteContext(context: {
  params: Promise<{ sortId: string; recipeId: string }>;
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

  const { sortId, recipeId } = await context.params;
  const sort = await createSupabaseSortDraftStore(supabase).getSortDraft({
    userId: session.user.id,
    sortId
  });

  if (!sort) {
    return NextResponse.json({ error: "Sort draft not found." }, { status: 404 });
  }

  const recipeStore = createSupabasePlaylistRecipeStore(supabase);
  const recipes = await recipeStore.listRecipesForSort({
    userId: session.user.id,
    sortRunId: sort.id
  });

  if (!recipes.some((recipe) => recipe.id === recipeId)) {
    return NextResponse.json({ error: "Playlist Recipe not found." }, { status: 404 });
  }

  return {
    recipeId,
    session,
    recipeStore
  };
}
