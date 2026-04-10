import Link from "next/link";

import { Button } from "@/components/ui/button";

export function PricingCta() {
  return (
    <section className="bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-28">
        <div className="grid gap-8 border-t border-white/12 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/55">Pricing</p>
            <h2 className="mt-4 max-w-3xl font-display text-5xl tracking-[-0.04em]">
              One preview is free. One confirmed sort is a single checkout.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
              No subscription for the first version. The user sees exactly which playlists will be
              created before paying, then confirms the write back into Apple Music.
            </p>
          </div>

          <div className="flex flex-col items-start gap-4 lg:items-end">
            <div className="font-display text-6xl tracking-[-0.05em]">$19</div>
            <Link href="/dashboard">
              <Button className="min-w-44">Connect Apple Music</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

