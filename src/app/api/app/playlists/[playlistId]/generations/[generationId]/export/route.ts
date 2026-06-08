import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabasePlaylistGenerationExportStore,
  queuePlaylistGenerationExport
} from "@/modules/playlists/generation-export";

export async function POST(
  _request: Request,
  context: { params: Promise<{ playlistId: string; generationId: string }> }
) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json({ error: "Playlist export is not configured." }, { status: 503 });
  }

  const { playlistId, generationId } = await context.params;
  const result = await withPgBoss((queue) =>
    queuePlaylistGenerationExport({
      store: createSupabasePlaylistGenerationExportStore(supabase),
      queue,
      userId: session.user.id,
      playlistId,
      generationId
    })
  );

  if (!result) {
    return NextResponse.json({ error: "Playlist export queue is not configured." }, { status: 503 });
  }

  if (result.status === "playlist_not_found" || result.status === "generation_not_found") {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }

  if (result.status !== "queued") {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  return NextResponse.json({ export: result }, { status: 202 });
}
