import { NextResponse } from "next/server";

export async function POST(_request: Request, _context: { params: Promise<{ id: string }> }) {
  void _request;
  void _context;

  return NextResponse.json(
    { error: "Use the reviewed export endpoint to create Apple Music playlists." },
    { status: 409 }
  );
}
