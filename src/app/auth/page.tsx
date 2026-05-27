import { redirect } from "next/navigation";
import Link from "next/link";

import {
  signInWithApple,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword
} from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { getOAuthProviderAvailability } from "@/lib/auth/oauth";
import { getAuthenticatedSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AuthPage({
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
  const oauthProviders = getOAuthProviderAvailability();

  return (
    <main className="min-h-screen bg-platform-bg text-white">
      <div className="pointer-events-none fixed inset-0 bg-hero-bloom opacity-80" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(255,45,85,0.16),transparent_24rem),linear-gradient(130deg,rgba(0,0,0,0)_48%,rgba(25,4,10,0.72)_100%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12 lg:px-10">
        <section className="w-full max-w-[30rem] rounded-[2rem] border border-white/10 bg-white/[0.08] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur">
          <Link href="/" className="inline-flex items-center gap-3 font-display text-xl font-semibold tracking-[0em]">
            <span className="h-3 w-3 rounded-full bg-accent-sweep shadow-pulse" />
            <span>Organize Your Music</span>
          </Link>

          <div className="mt-8">
            <p className="text-sm uppercase tracking-[0.18em] text-white/45">Start a Sort</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-[0em]">
              Create your account
            </h1>
            <p className="mt-3 text-sm leading-7 text-platform-secondary">
              Enter the app workspace first. Apple Music connection happens after signup.
            </p>
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

          <div className="mt-6 grid gap-3">
            <form action={signInWithApple}>
              <Button
                className="w-full"
                disabled={!isConfigured || !oauthProviders.apple.enabled}
                title={oauthProviders.apple.disabledReason ?? undefined}
                variant="glass"
              >
                Continue with Apple
              </Button>
            </form>
            <form action={signInWithGoogle}>
              <Button
                className="w-full"
                disabled={!isConfigured || !oauthProviders.google.enabled}
                title={oauthProviders.google.disabledReason ?? undefined}
                variant="glass"
              >
                Continue with Google
              </Button>
            </form>
            {!oauthProviders.apple.enabled || !oauthProviders.google.enabled ? (
              <p className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs leading-5 text-platform-muted">
                Apple and Google sign-in appear here for the platform flow. They stay disabled
                until OAuth providers are configured in Supabase.
              </p>
            ) : null}
          </div>

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

              <div className="mt-2 grid gap-3">
                <Button
                  formAction={signUpWithPassword}
                  disabled={!isConfigured}
                  className="w-full"
                >
                  Create account
                </Button>
                <Button
                  formAction={signInWithPassword}
                  disabled={!isConfigured}
                  variant="ghost"
                  className="w-full"
                >
                  Sign in
                </Button>
              </div>
            </form>

          <p className="mt-6 text-center text-xs leading-5 text-platform-muted">
            By continuing, you agree to Terms and Privacy Policy.
          </p>
        </section>
      </div>
    </main>
  );
}
