import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { NewPlaylistForm } from "@/components/app/playlists/new-playlist-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { getAuthenticatedSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function NewPlaylistPage() {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    redirect("/auth");
  }

  return (
    <AppShell
      title="Create Playlist"
      subtitle="Create a saved playlist, define a simple recipe, generate proposed tracks, and review before export."
    >
      <section className="mb-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <StatusPill label="One playlist" tone="success" />
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[0em] text-white">
            Add a playlist idea without full organization
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            Use this after the first library organization when you have a new playlist idea.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/app/playlists" className="inline-flex">
            <Button variant="glass">Back</Button>
          </Link>
          <Link href="/app/sorts/new" className="inline-flex">
            <Button variant="glass">Organize My Library</Button>
          </Link>
        </div>
      </section>

      <NewPlaylistForm />

      <Card className="mt-6">
        <StatusPill label="Apple Music safety" tone="warning" />
        <p className="mt-3 text-sm leading-7 text-platform-secondary">
          Creating this app playlist does not write to Apple Music. Export remains a separate
          confirmation step after review.
        </p>
      </Card>
    </AppShell>
  );
}
