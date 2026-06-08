import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SortCheckoutRedirectPage({
  params
}: {
  params: Promise<{ sortId: string }>;
}) {
  const { sortId } = await params;
  redirect(`/app/sorts/${encodeURIComponent(sortId)}/start`);
}
