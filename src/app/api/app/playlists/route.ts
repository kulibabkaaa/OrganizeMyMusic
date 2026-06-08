import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabasePlaylistStore } from "@/modules/playlists/store";

export async function GET() {
  const context = await getPlaylistRouteContext();

  if (context instanceof NextResponse) {
    return context;
  }

  const { playlistStore, session } = context;
  const playlists = await playlistStore.listPlaylists({
    userId: session.user.id
  });

  return NextResponse.json({ playlists });
}

export async function POST(request: Request) {
  const context = await getPlaylistRouteContext();

  if (context instanceof NextResponse) {
    return context;
  }

  try {
    const { playlistStore, session, supabase } = context;
    await ensureProfileForUser(supabase, session.user);
    const playlist = await playlistStore.createPlaylist({
      userId: session.user.id,
      playlist: await request.json().catch(() => null)
    });

    return NextResponse.json({ playlist }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid playlist payload." }, { status: 400 });
    }

    throw error;
  }
}

async function getPlaylistRouteContext() {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json({ error: "Playlist storage is not configured." }, { status: 503 });
  }

  return {
    session,
    supabase,
    playlistStore: createSupabasePlaylistStore(supabase)
  };
}
