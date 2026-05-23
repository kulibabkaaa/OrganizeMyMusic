import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { retrySortRunWriteBack } from "@/modules/recovery/retry";
import { createSupabaseSortRunRetryStore } from "@/modules/recovery/supabase";

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
      { error: "Sort run retry storage is not configured." },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  const result = await withPgBoss((queue) =>
    retrySortRunWriteBack({
      store: createSupabaseSortRunRetryStore(supabase),
      queue,
      sortRunId: id,
      userId: session.user.id
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

  if (result.status !== "retried") {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  return NextResponse.json(result);
}
