import { NextResponse } from "next/server";

import { createAppleDeveloperToken } from "@/modules/apple-music/developer-token";

export async function POST() {
  const token = await createAppleDeveloperToken();
  return NextResponse.json(token);
}

