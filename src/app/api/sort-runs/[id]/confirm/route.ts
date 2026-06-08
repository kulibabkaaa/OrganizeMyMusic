import { NextResponse } from "next/server";

export async function POST(_request: Request, _context: { params: Promise<{ id: string }> }) {
  void _request;
  const { id } = await _context.params;

  return NextResponse.json(
    {
      error: "Legacy Sort confirmation is disabled. Review the Sort in the platform workflow before exporting approved tracks.",
      nextPath: `/app/sorts/${encodeURIComponent(id)}/review`,
      nextApiPath: `/api/app/sorts/${encodeURIComponent(id)}/export`
    },
    { status: 409 }
  );
}
