import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabasePlaylistRecipeStore } from "@/modules/playlist-recipes/store";
import {
  createSupabaseSortDraftStore,
  getPreviewReadiness,
  updateSortDraft
} from "@/modules/sorts/drafts";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sortId: string }> }
) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json({ error: "Sort draft storage is not configured." }, { status: 503 });
  }

  const { sortId } = await context.params;
  const sortStore = createSupabaseSortDraftStore(supabase);
  const sort = await sortStore.getSortDraft({
    userId: session.user.id,
    sortId
  });

  if (!sort) {
    return NextResponse.json({ error: "Sort draft not found." }, { status: 404 });
  }

  const sync = sort.librarySyncId
    ? await sortStore.getLibrarySyncForUser({
        userId: session.user.id,
        librarySyncId: sort.librarySyncId
      })
    : null;
  const recipes = await createSupabasePlaylistRecipeStore(supabase).listRecipesForSort({
    userId: session.user.id,
    sortRunId: sort.id
  });

  return NextResponse.json({
    status: "ready",
    sort,
    recipes,
    preview: getPreviewReadiness(sync?.status ?? null)
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sortId: string }> }
) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json({ error: "Sort draft storage is not configured." }, { status: 503 });
  }

  try {
    const { sortId } = await context.params;
    const result = await updateSortDraft({
      store: createSupabaseSortDraftStore(supabase),
      userId: session.user.id,
      sortId,
      input: await request.json().catch(() => null)
    });

    if (result.status === "missing_library_sync") {
      return NextResponse.json({ error: "Library sync not found." }, { status: 404 });
    }

    if (result.status === "not_found") {
      return NextResponse.json({ error: "Sort draft not found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid Sort draft payload." }, { status: 400 });
    }

    throw error;
  }
}
