import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseLibrarySyncStore } from "@/modules/library-syncs/queue";
import { retryLibrarySync } from "@/modules/recovery/retry";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const { id } = await context.params;
  const result = await withPgBoss((queue) =>
    retryLibrarySync({
      store: createSupabaseLibrarySyncStore(supabase),
      queue,
      syncId: id,
      userId: session.user.id
    })
  );

  if (!result) {
    return NextResponse.json(
      { error: "Library sync queue is not configured." },
      { status: 503 }
    );
  }

  if (result.status === "not_found") {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }

  if (result.status !== "retried") {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  return NextResponse.json(result);
}
