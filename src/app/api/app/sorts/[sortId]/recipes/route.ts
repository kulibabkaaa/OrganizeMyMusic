import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { playlistRecipeCreateSchema } from "@/modules/playlist-recipes/schema";
import { createSupabasePlaylistRecipeStore } from "@/modules/playlist-recipes/store";
import { createSupabaseSortDraftStore } from "@/modules/sorts/drafts";

const reorderRecipesSchema = z.object({
  positions: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number().int().min(0)
      })
    )
    .max(100)
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ sortId: string }> }
) {
  const contextResult = await getRecipeRouteContext(context);

  if (contextResult instanceof NextResponse) {
    return contextResult;
  }

  const { recipeStore, session, sort } = contextResult;
  const recipes = await recipeStore.listRecipesForSort({
    userId: session.user.id,
    sortRunId: sort.id
  });

  return NextResponse.json({ recipes });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ sortId: string }> }
) {
  const contextResult = await getRecipeRouteContext(context);

  if (contextResult instanceof NextResponse) {
    return contextResult;
  }

  try {
    const { recipeStore, session, sort } = contextResult;
    const body = await request.json().catch(() => null);
    const recipe = playlistRecipeCreateSchema.parse({
      ...(typeof body === "object" && body ? body : {}),
      sortRunId: sort.id
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sortId: string }> }
) {
  const contextResult = await getRecipeRouteContext(context);

  if (contextResult instanceof NextResponse) {
    return contextResult;
  }

  try {
    const { recipeStore, session, sort } = contextResult;
    const body = reorderRecipesSchema.parse(await request.json().catch(() => null));

    return NextResponse.json({
      recipes: await recipeStore.reorderRecipes({
        userId: session.user.id,
        sortRunId: sort.id,
        positions: body.positions
      })
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid Playlist Recipe reorder payload." }, { status: 400 });
    }

    throw error;
  }
}

async function getRecipeRouteContext(context: { params: Promise<{ sortId: string }> }) {
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

  const { sortId } = await context.params;
  const sort = await createSupabaseSortDraftStore(supabase).getSortDraft({
    userId: session.user.id,
    sortId
  });

  if (!sort) {
    return NextResponse.json({ error: "Sort draft not found." }, { status: 404 });
  }

  return {
    session,
    sort,
    recipeStore: createSupabasePlaylistRecipeStore(supabase)
  };
}
