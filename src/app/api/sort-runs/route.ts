import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createPlaylistRequestSortRun,
  createSupabasePlaylistRequestStore
} from "@/modules/playlist-requests/parser";
import {
  createSupabasePreviewSnapshotStore,
  generateAndStorePreviewSnapshot
} from "@/modules/sorts/preview-snapshot";

const createSortRunSchema = z.object({
  librarySyncId: z.string().uuid(),
  playlistRequests: z.array(z.string().min(1).max(120)).min(3).max(20)
});

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsedBody = createSortRunSchema.safeParse(await request.json().catch(() => null));

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Provide a completed library sync and at least three playlist requests." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Playlist request storage is not configured." },
      { status: 503 }
    );
  }

  const requestStore = createSupabasePlaylistRequestStore(supabase);
  const result = await createPlaylistRequestSortRun({
    store: requestStore,
    userId: session.user.id,
    librarySyncId: parsedBody.data.librarySyncId,
    playlistRequests: parsedBody.data.playlistRequests
  });

  if (result.status === "too_few_requests") {
    return NextResponse.json(
      { error: `Define at least ${result.minimumRequests} playlist requests.` },
      { status: 400 }
    );
  }

  if (result.status === "missing_completed_sync") {
    return NextResponse.json(
      { error: "Complete a library sync before requesting playlists." },
      { status: 409 }
    );
  }

  const preview = await generateAndStorePreviewSnapshot({
    store: createSupabasePreviewSnapshotStore(supabase),
    sortRunId: result.sortRun.id,
    userId: session.user.id
  });

  return NextResponse.json({
    sortRunId: result.sortRun.id,
    state: preview.status === "created" || preview.status === "existing" ? "preview_ready" : result.sortRun.state,
    playlistRequests: result.sortRun.requests,
    previewSnapshot:
      preview.status === "created" || preview.status === "existing" ? preview.snapshot : null
  });
}
