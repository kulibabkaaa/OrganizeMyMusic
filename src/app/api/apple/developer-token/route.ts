import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import {
  AppleDeveloperTokenConfigError,
  createAppleDeveloperToken
} from "@/modules/apple-music/developer-token";

export async function GET() {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const token = await createAppleDeveloperToken();

    return NextResponse.json(token, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof AppleDeveloperTokenConfigError) {
      return NextResponse.json(
        {
          error: "Apple Music developer token is not configured.",
          missing: error.missing
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Unable to generate Apple Music developer token."
      },
      { status: 500 }
    );
  }
}
