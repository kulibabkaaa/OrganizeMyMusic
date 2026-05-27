import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  if (message) {
    redirect(`/auth?message=${encodeURIComponent(message)}`);
  }

  redirect("/auth");
}
