import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabasePlaylistGenerationStore } from "@/modules/playlists/generation-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ playlistId: string }> }
) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json({ error: "Playlist generation is not configured." }, { status: 503 });
  }

  const { playlistId } = await context.params;
  const result = await createSupabasePlaylistGenerationStore(supabase).generatePlaylist({
    userId: session.user.id,
    playlistId
  });

  if (result.status === "playlist_not_found") {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }

  if (result.status !== "generated") {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  return NextResponse.json(
    {
      recipe: result.recipe,
      generation: result.generation
    },
    { status: 201 }
  );
}
