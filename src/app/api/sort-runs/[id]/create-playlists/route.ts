import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await context.params;

  return NextResponse.json(
    {
      error: "Playlist creation requires the MVP-020 confirmation flow."
    },
    { status: 409 }
  );
}
