import { NextResponse } from "next/server";
import { z } from "zod";

import { persistAppleConnection } from "@/modules/apple-music/auth";

const connectSchema = z.object({
  userId: z.string().min(1),
  storefront: z.string().min(1),
  userToken: z.string().min(1)
});

export async function POST(request: Request) {
  const payload = connectSchema.parse(await request.json());
  const connection = persistAppleConnection(payload);

  return NextResponse.json({
    ok: true,
    connection
  });
}

