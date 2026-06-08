import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabasePlaylistGenerationStore,
  PlaylistGenerationTrackNotFoundError
} from "@/modules/playlists/generation-store";
import { createSupabasePlaylistStore } from "@/modules/playlists/store";

const decisionSchema = z.object({
  markReviewed: z.boolean().optional().default(false),
  decisions: z
    .array(
      z.object({
        trackId: z.string().uuid(),
        decision: z.enum(["keep", "remove"])
      })
    )
    .max(500)
}).superRefine((value, context) => {
  if (!value.markReviewed && value.decisions.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["decisions"],
      message: "At least one track decision is required unless review is being completed."
    });
  }
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
    const playlist = await createSupabasePlaylistStore(supabase).getPlaylist({
      userId: session.user.id,
      playlistId
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
    }

    if (playlist.status === "archived") {
      return NextResponse.json(
        { error: "Archived playlists cannot be reviewed." },
        { status: 409 }
      );
    }

    const generation = await createSupabasePlaylistGenerationStore(supabase).updateTrackDecisions({
      userId: session.user.id,
      playlistId,
      generationId,
      markReviewed: body.markReviewed,
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

    if (error instanceof PlaylistGenerationTrackNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    throw error;
  }
}
