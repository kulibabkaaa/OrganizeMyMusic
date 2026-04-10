"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

const MUSICKIT_SCRIPT = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";

async function loadMusicKitScript() {
  if (window.MusicKit) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MUSICKIT_SCRIPT}"]`);

    if (existing) {
      if (window.MusicKit) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load MusicKit.")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = MUSICKIT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load MusicKit."));
    document.body.appendChild(script);
  });
}

export function AppleMusicConnectCard() {
  const [status, setStatus] = useState<"idle" | "ready" | "connected" | "error">("idle");
  const [message, setMessage] = useState("Load MusicKit and prepare Apple Music sign-in.");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await loadMusicKitScript();

        const response = await fetch("/api/apple/developer-token", {
          method: "POST"
        });
        const payload = (await response.json()) as { token: string };

        if (cancelled || !window.MusicKit) {
          return;
        }

        window.MusicKit.configure({
          developerToken: payload.token,
          app: {
            name: "Organize Your Music",
            build: "0.1.0"
          }
        });

        setStatus("ready");
        setMessage("MusicKit is ready. Authorize Apple Music to persist the connection.");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "MusicKit setup failed.");
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  async function connectAppleMusic() {
    if (!window.MusicKit) {
      setStatus("error");
      setMessage("MusicKit is not available.");
      return;
    }

    startTransition(async () => {
      try {
        const instance = window.MusicKit.getInstance();

        if (!instance) {
          throw new Error("MusicKit is not ready yet.");
        }

        const userToken = await instance.authorize();
        const storefront = instance.storefrontId ?? "us";

        await fetch("/api/apple/connect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId: "demo-user",
            storefront,
            userToken
          })
        });

        setStatus("connected");
        setMessage("Apple Music connected. The account token is now ready for sync and playlist creation.");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Apple Music connection failed.");
      }
    });
  }

  return (
    <section className="rounded-[2rem] bg-black p-7 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-white/48">Apple Music</p>
          <h2 className="mt-2 font-display text-3xl tracking-[-0.04em]">
            Connect once, then keep the write step explicit.
          </h2>
        </div>
        <StatusPill
          label={status === "connected" ? "Connected" : status === "ready" ? "Ready" : status}
          tone={status === "connected" ? "success" : status === "error" ? "warning" : "neutral"}
        />
      </div>

      <p className="mt-5 max-w-xl text-sm leading-7 text-white/68">{message}</p>

      <div className="mt-6">
        <Button
          onClick={connectAppleMusic}
          disabled={isPending || status === "idle"}
          className="min-w-48"
        >
          {isPending ? "Connecting..." : "Connect Apple Music"}
        </Button>
      </div>
    </section>
  );
}
