import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabasePreviewSnapshotStore } from "@/modules/sorts/preview-snapshot";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Preview storage is not configured." },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  const sortRun = await createSupabasePreviewSnapshotStore(supabase).getSortRunForPreview({
    sortRunId: id,
    userId: session.user.id
  });

  if (!sortRun) {
    return NextResponse.json({ error: "Sort run not found." }, { status: 404 });
  }

  return NextResponse.json({
    sortRunId: sortRun.id,
    state: sortRun.state,
    paymentStatus: sortRun.paymentStatus,
    previewSnapshot: sortRun.previewSnapshot,
    playlistRequests: sortRun.requests
  });
}
