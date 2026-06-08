import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await context.params;

  return NextResponse.json(
    {
      error: "Legacy Sort write-back retry is disabled. Reopen the Sort in the platform review flow before exporting approved tracks.",
      nextPath: `/app/sorts/${encodeURIComponent(id)}/review`,
      nextApiPath: `/api/app/sorts/${encodeURIComponent(id)}/export`
    },
    { status: 409 }
  );
}
