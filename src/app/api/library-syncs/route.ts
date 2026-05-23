import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseLibrarySyncStore,
  getLatestLibrarySyncStatus,
  queueLibrarySync
} from "@/modules/library-syncs/queue";

export async function POST() {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Library sync storage is not configured." },
      { status: 503 }
    );
  }

  const result = await withPgBoss((queue) =>
    queueLibrarySync({
      store: createSupabaseLibrarySyncStore(supabase),
      queue,
      userId: session.user.id
    })
  );

  if (!result) {
    return NextResponse.json(
      { error: "Library sync queue is not configured." },
      { status: 503 }
    );
  }

  if (result.status === "missing_apple_music_connection") {
    return NextResponse.json(
      { error: "Connect Apple Music before starting a library sync." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    syncId: result.sync.id,
    status: result.sync.status,
    jobId: result.jobId
  });
}

export async function GET() {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Library sync storage is not configured." },
      { status: 503 }
    );
  }

  const result = await getLatestLibrarySyncStatus({
    store: createSupabaseLibrarySyncStore(supabase),
    userId: session.user.id
  });

  return NextResponse.json({
    sync: result?.sync ?? null,
    events: result?.events ?? []
  });
}
