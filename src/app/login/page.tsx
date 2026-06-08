import { redirect } from "next/navigation";
import Link from "next/link";

import { signInWithPassword, signUpWithPassword } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { getAuthenticatedSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const session = await getAuthenticatedSession();

  if (session.status === "authenticated") {
    redirect("/app");
  }

  const { message } = await searchParams;
  const isConfigured = session.status !== "missing_config";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-hero-bloom opacity-80" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12 lg:px-10">
        <section className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Link href="/" className="font-display text-xl tracking-[-0.03em]">
              Organize Your Music
            </Link>
            <h1 className="mt-8 max-w-xl font-display text-5xl font-semibold leading-[1.02] tracking-[0em]">
              Sign in before any library data is shown.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-white/68">
              Supabase Auth protects the dashboard and keeps each Apple Music library attached to
              its owner before sync or playlist planning begins.
            </p>
          </div>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-white/45">Account</p>
                <h2 className="mt-2 font-display text-3xl tracking-[-0.04em]">
                  Email login
                </h2>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white/70">
                Supabase
              </span>
            </div>

            {message ? (
              <p className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                {message}
              </p>
            ) : null}

            {!isConfigured ? (
              <p className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                Supabase URL and anon key must be set before login can run.
              </p>
            ) : null}

            <form className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm text-white/70">
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="min-h-12 rounded-2xl border border-white/10 bg-black/35 px-4 text-base text-white outline-none transition focus:border-white/35"
                />
              </label>
              <label className="grid gap-2 text-sm text-white/70">
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  required
                  className="min-h-12 rounded-2xl border border-white/10 bg-black/35 px-4 text-base text-white outline-none transition focus:border-white/35"
                />
              </label>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <Button formAction={signInWithPassword} disabled={!isConfigured} className="min-w-36">
                  Sign in
                </Button>
                <Button
                  formAction={signUpWithPassword}
                  disabled={!isConfigured}
                  variant="secondary"
                  className="min-w-36 border-white/15 bg-white/10 text-white"
                >
                  Create account
                </Button>
              </div>
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}
