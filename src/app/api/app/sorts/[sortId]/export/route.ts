import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseSortRunExportStore,
  exportReviewedPlaylists
} from "@/modules/sorts/export-selection";
import { loadStoredFullSortReviewSnapshot } from "@/modules/sorts/full-sort-job";
import { createSupabasePreviewSnapshotStore } from "@/modules/sorts/preview-snapshot";

const exportReviewedPlaylistsSchema = z.object({
  selectedPlaylistIds: z.array(z.string().min(1).max(160)).max(100),
  removedTrackFingerprintsByPlaylistId: z
    .record(z.array(z.string().min(1).max(240)).max(1000))
    .default({}),
  renamedPlaylistTitlesById: z.record(z.string().min(1).max(160)).default({})
});

export async function POST(
  request: Request,
  context: { params: Promise<{ sortId: string }> }
) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsedBody = exportReviewedPlaylistsSchema.safeParse(await request.json().catch(() => null));

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid export payload." }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Sort export storage is not configured." },
      { status: 503 }
    );
  }

  const { sortId } = await context.params;
  const previewStore = createSupabasePreviewSnapshotStore(supabase);
  const getSortRunForExport: typeof previewStore.getSortRunForPreview = async (input) => {
    const sortRun = await previewStore.getSortRunForPreview(input);

    if (!sortRun || (sortRun.state !== "paid" && sortRun.state !== "failed")) {
      return sortRun;
    }

    const storedSnapshot = await loadStoredFullSortReviewSnapshot({
      supabase,
      sortRunId: sortRun.id,
      librarySyncId: sortRun.librarySyncId
    });

    return {
      ...sortRun,
      previewSnapshot: storedSnapshot ?? sortRun.previewSnapshot
    };
  };
  const result = await withPgBoss((queue) =>
    exportReviewedPlaylists({
      store: createSupabaseSortRunExportStore(supabase, getSortRunForExport),
      queue,
      sortRunId: sortId,
      userId: session.user.id,
      selection: {
        selectedPlaylistIds: parsedBody.data.selectedPlaylistIds,
        removedTrackFingerprintsByPlaylistId:
          parsedBody.data.removedTrackFingerprintsByPlaylistId,
        renamedPlaylistTitlesById: parsedBody.data.renamedPlaylistTitlesById
      }
    })
  );

  if (!result) {
    return NextResponse.json(
      { error: "Playlist export queue is not configured." },
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
