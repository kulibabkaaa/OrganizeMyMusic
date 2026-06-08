import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabasePlaylistGenerationStore } from "@/modules/playlists/generation-store";

const decisionSchema = z.object({
  decisions: z
    .array(
      z.object({
        trackId: z.string().uuid(),
        decision: z.enum(["keep", "remove"])
      })
    )
    .min(1)
    .max(500)
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ playlistId: string; generationId: string }> }
) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json({ error: "Playlist generation is not configured." }, { status: 503 });
  }

  try {
    const { playlistId, generationId } = await context.params;
    const body = decisionSchema.parse(await request.json().catch(() => null));
    const generation = await createSupabasePlaylistGenerationStore(supabase).updateTrackDecisions({
      userId: session.user.id,
      playlistId,
      generationId,
      decisions: body.decisions
    });

    if (!generation) {
      return NextResponse.json({ error: "Playlist generation not found." }, { status: 404 });
    }

    return NextResponse.json({ generation });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid track decision payload." }, { status: 400 });
    }

    throw error;
  }
}
