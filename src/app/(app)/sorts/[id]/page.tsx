import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { SortRunPanel } from "@/components/app/sort-run-panel";
import { Button } from "@/components/ui/button";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getSortPreview } from "@/modules/sorts/service";

export const dynamic = "force-dynamic";

export default async function SortRunPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return (
      <AppShell
        title="Sort"
        subtitle="Sign in before viewing private Apple Music preview data."
      >
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-7">
          <p className="text-sm uppercase tracking-[0.18em] text-white/42">Account required</p>
          <h2 className="mt-3 font-display text-3xl tracking-[0em]">Preview is private.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
            Sign in with the account that created this Sort to inspect playlist output.
          </p>
          <a href="/auth" className="mt-6 inline-flex">
            <Button>Sign in</Button>
          </a>
        </section>
      </AppShell>
    );
  }

  const previewResult = await getSortPreview(id, session.user.id);

  if (previewResult.status === "not_found") {
    notFound();
  }

  const previewErrorMessage =
    previewResult.status === "error" ? previewResult.message : null;

  return (
    <AppShell
      title="Sort"
      subtitle="Inspect generated playlists and tracks before Apple Music export."
    >
      {previewResult.status === "ready" ? (
        <SortRunPanel sortRun={previewResult.sortRun} />
      ) : (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-7">
          <p className="text-sm uppercase tracking-[0.18em] text-white/42">
            Preview unavailable
          </p>
          <h2 className="mt-3 font-display text-3xl tracking-[0em]">
            {previewResult.status === "missing_config"
              ? "Preview is temporarily unavailable."
              : "Preview could not be loaded."}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
            {previewResult.status === "missing_config"
              ? "Stored previews are not available right now. Try again later."
              : previewErrorMessage}
          </p>
        </section>
      )}
    </AppShell>
  );
}
