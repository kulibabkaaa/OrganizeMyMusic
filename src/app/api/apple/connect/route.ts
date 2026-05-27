import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { persistAppleMusicUserToken } from "@/modules/apple-music/auth";
import { acceptAppleMusicConnection, parseAppleMusicConnectPayload } from "@/modules/apple-music/connect";
import {
  createSupabaseLibrarySyncStore,
  queueLibrarySyncAfterConnection
} from "@/modules/library-syncs/queue";

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const payload = parseAppleMusicConnectPayload(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid Apple Music connection payload." }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Apple Music connection storage is not configured." },
      { status: 503 }
    );
  }

  const persisted = await persistAppleMusicUserToken({
    supabase,
    userId: session.user.id,
    ...payload.data
  });

  if (persisted.status === "error") {
    return NextResponse.json({ error: persisted.message }, { status: 500 });
  }

  let autoSync:
    | { status: "queued" | "already_active"; syncId: string; jobId?: string | null }
    | { status: "unavailable" | "failed" } = { status: "unavailable" };

  try {
    const queueResult = await withPgBoss((queue) =>
      queueLibrarySyncAfterConnection({
        store: createSupabaseLibrarySyncStore(supabase),
        queue,
        userId: session.user.id
      })
    );

    if (queueResult?.status === "queued") {
      autoSync = {
        status: "queued",
        syncId: queueResult.sync.id,
        jobId: queueResult.jobId
      };
    } else if (queueResult?.status === "already_active") {
      autoSync = {
        status: "already_active",
        syncId: queueResult.sync.id
      };
    }
  } catch {
    autoSync = { status: "failed" };
  }

  return NextResponse.json(
    {
      ...acceptAppleMusicConnection({
        userId: session.user.id,
        ...payload.data
      }),
      autoSync
    }
  );
}
