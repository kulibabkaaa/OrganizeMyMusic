"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  connectAppleMusicWithMusicKit,
  prepareAppleMusicAuthorization,
  type PreparedAppleMusicAuthorization
} from "@/modules/apple-music/musickit-browser";

type ConnectionState = "idle" | "connecting" | "connected" | "error";

export function AppleMusicConnectCard({
  canConnect = true,
  initiallyConnected = false,
  initialStorefront = null
}: {
  canConnect?: boolean;
  initiallyConnected?: boolean;
  initialStorefront?: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<ConnectionState>(initiallyConnected ? "connected" : "idle");
  const [storefront, setStorefront] = useState<string | null>(initialStorefront);
  const [prepared, setPrepared] = useState<PreparedAppleMusicAuthorization | null>(null);
  const [message, setMessage] = useState(
    initiallyConnected
      ? "Apple Music authorization is stored encrypted server-side."
      : canConnect
      ? "Authorize Apple Music with MusicKit. The browser receives a MusicKit user token and sends it to the backend."
      : "Sign in before connecting Apple Music. MusicKit authorization stays disabled while signed out."
  );
  const isConnected = state === "connected";
  const isPreparing = canConnect && !isConnected && state !== "error" && !prepared;
  const isBusy = state === "connecting";

  useEffect(() => {
    if (!canConnect || initiallyConnected) {
      return;
    }

    let isCancelled = false;

    setMessage("Preparing Apple Music authorization...");
    const preparation = prepareAppleMusicAuthorization();

    preparation
      .then((result) => {
        if (isCancelled) {
          return;
        }

        setPrepared(result);
        setMessage("Apple Music authorization is ready. Click Connect Apple Music to open Apple's approval prompt.");
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setState("error");
        setMessage(error instanceof Error ? error.message : "Unable to prepare Apple Music authorization.");
      });

    return () => {
      isCancelled = true;
    };
  }, [canConnect, initiallyConnected]);

  function handleConnect() {
    if (!prepared) {
      setMessage("Apple Music authorization is still preparing. Try again in a moment.");
      return;
    }

    setState("connecting");
    setMessage("Opening Apple Music authorization...");

    void connectAppleMusicWithMusicKit(fetch, prepared)
      .then((result) => {
        setStorefront(result.storefront);
        setState("connected");
        setMessage("Apple Music authorization succeeded. The user token is encrypted and stored server-side.");
        router.push("/app?connected=apple_music");
        router.refresh();
      })
      .catch((error) => {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Unable to connect Apple Music.");
      });
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 text-white shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-white/48">Apple Music</p>
          <h2 className="mt-2 font-display text-3xl tracking-[-0.04em]">
            {isConnected ? "Apple Music connected" : "Connect Apple Music"}
          </h2>
        </div>
        <StatusPill
          label={isConnected ? "Connected" : state === "error" ? "Needs attention" : "Not connected"}
          tone={isConnected ? "success" : "warning"}
        />
      </div>

      <p className="mt-5 max-w-xl text-sm leading-7 text-white/68">
        {message}
      </p>
      {storefront ? (
        <p className="mt-3 text-sm leading-6 text-white/54">Storefront: {storefront}</p>
      ) : null}

      <div className="mt-6">
        <Button
          disabled={!canConnect || isPreparing || isBusy || isConnected}
          onClick={handleConnect}
          className="min-w-48 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isBusy
            ? "Connecting..."
            : isConnected
            ? "Connected"
            : isPreparing
            ? "Preparing..."
            : "Connect Apple Music"}
        </Button>
      </div>
    </section>
  );
}
