"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  connectAppleMusicWithMusicKit,
  prepareAppleMusicAuthorization,
  type PreparedAppleMusicAuthorization
} from "@/modules/apple-music/musickit-browser";

type ConnectActionState = "idle" | "preparing" | "ready" | "connecting" | "connected" | "error";

export function AppleMusicConnectAction({
  label = "Connect Apple Music",
  variant = "primary"
}: {
  label?: string;
  variant?: "primary" | "glass";
}) {
  const router = useRouter();
  const [state, setState] = useState<ConnectActionState>("idle");
  const [prepared, setPrepared] = useState<PreparedAppleMusicAuthorization | null>(null);
  const [message, setMessage] = useState("Preparing Apple Music connection...");
  const [isPending, startTransition] = useTransition();
  const isBusy = state === "preparing" || state === "connecting" || isPending;
  const statusId = "apple-music-connect-status";

  function prepareConnection(isCancelled: () => boolean) {
    setState("preparing");
    setPrepared(null);
    setMessage("Preparing Apple Music connection...");

    prepareAppleMusicAuthorization()
      .then((result) => {
        if (isCancelled()) {
          return;
        }

        setPrepared(result);
        setState("ready");
        setMessage("Apple Music is ready to connect.");
      })
      .catch((error) => {
        if (isCancelled()) {
          return;
        }

        setState("error");
        setMessage(error instanceof Error ? error.message : "Unable to prepare Apple Music.");
      });
  }

  useEffect(() => {
    let isCancelled = false;

    prepareConnection(() => isCancelled);

    return () => {
      isCancelled = true;
    };
  }, []);

  function handleConnect() {
    if (state === "error") {
      prepareConnection(() => false);
      return;
    }

    if (!prepared) {
      setMessage("Apple Music is still getting ready. Try again in a moment.");
      return;
    }

    setState("connecting");
    setMessage("Opening Apple Music...");

    startTransition(async () => {
      try {
        await connectAppleMusicWithMusicKit(fetch, prepared);
        setState("connected");
        setMessage("Apple Music connected.");
        router.push("/app?connected=apple_music");
        router.refresh();
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Unable to connect Apple Music.");
      }
    });
  }

  return (
    <div>
      <Button
        variant={variant}
        disabled={isBusy || state === "connected" || (!prepared && state !== "error")}
        aria-describedby={statusId}
        onClick={handleConnect}
        className="min-w-52 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {state === "connecting"
          ? "Connecting..."
          : state === "connected"
          ? "Connected"
          : state === "preparing"
            ? "Preparing..."
            : state === "error"
              ? "Retry Apple Music"
            : label}
      </Button>
      <p
        id={statusId}
        className={[
          "mt-3 max-w-md text-sm leading-6",
          state === "error" ? "text-amber-100" : "text-platform-secondary"
        ].join(" ")}
        role={state === "error" ? "status" : undefined}
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}
