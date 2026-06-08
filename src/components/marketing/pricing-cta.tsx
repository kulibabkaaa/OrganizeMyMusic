import Link from "next/link";
import type { Route } from "next";
import React from "react";

import { Button } from "@/components/ui/button";

export function PricingCta({ connectHref = "/app" }: { connectHref?: Route }) {
  return (
    <section className="bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-28">
        <div className="grid gap-8 border-t border-white/12 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/55">MVP access</p>
            <h2 className="mt-4 max-w-3xl font-display text-5xl tracking-[-0.04em]">
              Organize now. Review carefully. Export only approved playlists.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
              Billing is deferred for the MVP. The product value is the saved playlist system:
              full-library Sorts, reusable recipes, individual playlist generation, and review-first
              Apple Music export.
            </p>
          </div>

          <div className="flex flex-col items-start gap-4 lg:items-end">
            <div className="font-display text-5xl tracking-[0em]">Review first</div>
            <Link href={connectHref}>
              <Button className="min-w-44">Open app</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
