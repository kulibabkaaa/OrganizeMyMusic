import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  await request.json().catch(() => null);

  return NextResponse.json({
    error: "Legacy playlist-request Sort creation is disabled. Create a platform Sort draft and add structured playlist recipes instead.",
    nextPath: "/app/sorts/new",
    nextApiPath: "/api/app/sorts"
  }, { status: 409 });
}
