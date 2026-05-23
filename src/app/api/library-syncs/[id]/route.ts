import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseLibrarySyncStore,
  getLibrarySyncStatus
} from "@/modules/library-syncs/queue";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Library sync storage is not configured." },
      { status: 503 }
    );
  }

  const result = await getLibrarySyncStatus({
    store: createSupabaseLibrarySyncStore(supabase),
    syncId: id,
    userId: session.user.id
  });

  if (!result) {
    return NextResponse.json({ error: "Library sync not found." }, { status: 404 });
  }

  return NextResponse.json({
    sync: result.sync,
    events: result.events
  });
}
