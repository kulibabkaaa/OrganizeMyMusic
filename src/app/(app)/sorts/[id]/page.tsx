import type { Route } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacySortRunPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  redirect(`/app/sorts/${encodeURIComponent(id)}` as Route);
}
