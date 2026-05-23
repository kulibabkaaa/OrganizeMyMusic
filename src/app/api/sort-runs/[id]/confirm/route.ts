import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  confirmSortRun,
  createSupabaseSortRunConfirmationStore
} from "@/modules/sorts/confirmation";
import { createSupabasePreviewSnapshotStore } from "@/modules/sorts/preview-snapshot";

const confirmSortRunSchema = z.object({
  selectedPlaylistIds: z.array(z.string().min(1).max(160)).max(100),
  removedTrackFingerprintsByPlaylistId: z
    .record(z.array(z.string().min(1).max(240)).max(1000))
    .default({})
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsedBody = confirmSortRunSchema.safeParse(await request.json().catch(() => null));

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid confirmation payload." }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Sort run confirmation storage is not configured." },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  const previewStore = createSupabasePreviewSnapshotStore(supabase);
  const result = await withPgBoss((queue) =>
    confirmSortRun({
      store: createSupabaseSortRunConfirmationStore(
        supabase,
        previewStore.getSortRunForPreview
      ),
      queue,
      sortRunId: id,
      userId: session.user.id,
      selection: {
        selectedPlaylistIds: parsedBody.data.selectedPlaylistIds,
        removedTrackFingerprintsByPlaylistId:
          parsedBody.data.removedTrackFingerprintsByPlaylistId
      }
    })
  );

  if (!result) {
    return NextResponse.json(
      { error: "Playlist creation queue is not configured." },
      { status: 503 }
    );
  }

  if (result.status === "not_found") {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }

  if (
    result.status === "missing_preview" ||
    result.status === "invalid_state" ||
    result.status === "invalid_selection"
  ) {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  if (result.status === "empty_selection") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json(result);
}
