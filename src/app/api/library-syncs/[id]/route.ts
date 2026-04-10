import { NextResponse } from "next/server";

import { demoJobEvents } from "@/lib/sample-data";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return NextResponse.json({
    id,
    status: "completed",
    progress: {
      rawTrackCount: 312,
      normalizedTrackCount: 285,
      duplicatesRemoved: 27
    },
    events: demoJobEvents
  });
}

