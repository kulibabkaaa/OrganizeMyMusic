import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseSortDraftStore,
  getPreviewReadiness
} from "@/modules/sorts/drafts";
import {
  createSupabaseLightweightPreviewStore,
  generateAndStoreLightweightPreview
} from "@/modules/sorts/lightweight-preview";

export async function POST(
  _request: Request,
  context: { params: Promise<{ sortId: string }> }
) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json({ error: "Preview storage is not configured." }, { status: 503 });
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
  const previewReadiness = getPreviewReadiness(sync?.status ?? null);

  if (!previewReadiness.canPreview) {
    return NextResponse.json(
      { error: previewReadiness.disabledReason ?? "Preview is not ready yet." },
      { status: 409 }
    );
  }

  const result = await generateAndStoreLightweightPreview({
    store: createSupabaseLightweightPreviewStore(supabase),
    sortRunId: sort.id,
    userId: session.user.id
  });

  switch (result.status) {
    case "created":
    case "existing":
      return NextResponse.json({
        status: result.status,
        previewSnapshot: result.snapshot
      });
    case "not_found":
      return NextResponse.json({ error: "Sort draft not found." }, { status: 404 });
    case "missing_library_sync":
      return NextResponse.json(
        { error: "Connect and sync Apple Music before previewing this Sort." },
        { status: 409 }
      );
    case "empty_recipes":
      return NextResponse.json(
        { error: "Add at least one Playlist Recipe before previewing this Sort." },
        { status: 400 }
      );
    case "immutable":
      return NextResponse.json(
        {
          error: "Preview is locked for this Sort.",
          previewSnapshot: result.snapshot
        },
        { status: 409 }
      );
  }
}
