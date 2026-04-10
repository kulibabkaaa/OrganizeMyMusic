"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { SortRunSummary } from "@/types/domain";

export function SortRunActions({ sortRun }: { sortRun: SortRunSummary }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState(
    "Preview is ready. Payment unlocks Apple playlist creation, but the final write still requires confirmation."
  );

  function beginCheckout() {
    startTransition(async () => {
      const response = await fetch(`/api/sort-runs/${sortRun.id}/checkout`, {
        method: "POST"
      });
      const payload = (await response.json()) as { checkoutUrl?: string };

      if (payload.checkoutUrl) {
        window.location.href = payload.checkoutUrl;
        return;
      }

      setMessage("Checkout session could not be created.");
    });
  }

  function createPlaylists() {
    startTransition(async () => {
      const response = await fetch(`/api/sort-runs/${sortRun.id}/create-playlists`, {
        method: "POST"
      });
      const payload = (await response.json()) as {
        result?: Array<{ title: string; success: boolean }>;
      };

      if (payload.result) {
        const successes = payload.result.filter((item) => item.success).length;
        setMessage(`${successes} playlists were accepted for Apple Music creation.`);
        return;
      }

      setMessage("Playlist creation failed.");
    });
  }

  return (
    <section className="rounded-[2rem] border border-black/8 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-black/42">Actions</p>
          <h2 className="mt-2 font-display text-3xl tracking-[-0.04em]">Review, pay, confirm</h2>
        </div>
        <StatusPill
          label={sortRun.paymentStatus === "paid" ? "Paid" : "Preview only"}
          tone={sortRun.paymentStatus === "paid" ? "success" : "accent"}
        />
      </div>

      <p className="mt-5 max-w-2xl text-sm leading-7 text-black/62">{message}</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={beginCheckout} disabled={isPending}>
          {isPending ? "Preparing..." : "Unlock with one-time payment"}
        </Button>
        <Button
          variant="secondary"
          onClick={createPlaylists}
          disabled={isPending || sortRun.paymentStatus !== "paid"}
        >
          {isPending ? "Submitting..." : "Confirm playlist creation"}
        </Button>
      </div>
    </section>
  );
}
