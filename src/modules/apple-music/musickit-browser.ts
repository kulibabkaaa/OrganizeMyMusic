import { z } from "zod";

export const MUSICKIT_SCRIPT_SRC = "https://js-cdn.music.apple.com/musickit/v1/musickit.js";
export const MUSIC_KIT_AUTHORIZE_TIMEOUT_MS = 45_000;

const developerTokenResponseSchema = z.object({
  developerToken: z.string().min(1),
  expiresAt: z.string().min(1)
});

export interface AuthorizedAppleMusicUserToken {
  musicUserToken: string;
  storefront: string;
}

export interface PreparedAppleMusicAuthorization {
  developerToken: string;
  expiresAt: string;
}

export interface MusicKitBrowserInstance {
  authorize(): Promise<string | void>;
  musicUserToken?: string;
  storefrontId?: string;
}

export interface MusicKitBrowserGlobal {
  configure(config: {
    developerToken: string;
    app: {
      name: string;
      build: string;
    };
  }): MusicKitBrowserInstance | void;
  getInstance(): MusicKitBrowserInstance;
}

export async function fetchAppleDeveloperToken(fetcher: typeof fetch = fetch) {
  const response = await fetcher("/api/apple/developer-token", {
    cache: "no-store",
    method: "GET"
  });

  if (!response.ok) {
    const payload = z
      .object({
        error: z.string().optional(),
        missing: z.array(z.string()).optional()
      })
      .catch({})
      .parse(await response.json().catch(() => ({})));
    const missing = payload.missing?.length ? ` Missing: ${payload.missing.join(", ")}.` : "";

    throw new Error(
      `${payload.error ?? "Unable to fetch Apple Music developer token."}${missing}`
    );
  }

  return developerTokenResponseSchema.parse(await response.json());
}

export async function loadMusicKitScript(documentRef: Document = document) {
  if (window.MusicKit) {
    return;
  }

  const existingScript = documentRef.querySelector<HTMLScriptElement>(
    `script[src="${MUSICKIT_SCRIPT_SRC}"]`
  );

  if (existingScript) {
    await new Promise<void>((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load MusicKit.")), {
        once: true
      });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = documentRef.createElement("script");
    script.src = MUSICKIT_SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Unable to load MusicKit.")), {
      once: true
    });
    documentRef.head.append(script);
  });
}

export async function prepareAppleMusicAuthorization(
  fetcher: typeof fetch = fetch
): Promise<PreparedAppleMusicAuthorization> {
  await loadMusicKitScript();

  if (!window.MusicKit) {
    throw new Error("MusicKit is unavailable.");
  }

  return fetchAppleDeveloperToken(fetcher);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function getAuthorizedAppleMusicUserToken(input: {
  musicKit: MusicKitBrowserGlobal;
  developerToken: string;
  appName: string;
  appBuild: string;
  authorizeTimeoutMs?: number;
}): Promise<AuthorizedAppleMusicUserToken> {
  const configuredInstance =
    input.musicKit.configure({
      developerToken: input.developerToken,
      app: {
        name: input.appName,
        build: input.appBuild
      }
    }) ?? input.musicKit.getInstance();

  const authorizedToken = await withTimeout(
    configuredInstance.authorize(),
    input.authorizeTimeoutMs ?? MUSIC_KIT_AUTHORIZE_TIMEOUT_MS,
    "Apple Music authorization did not open. Allow pop-ups for this site, disable content blockers for Apple Music, then try again."
  );
  const musicUserToken = authorizedToken || configuredInstance.musicUserToken;

  if (!musicUserToken) {
    throw new Error("MusicKit did not return a music user token.");
  }

  return {
    musicUserToken,
    storefront: configuredInstance.storefrontId ?? "unknown"
  };
}

export function createAppleMusicConnectRequest(input: AuthorizedAppleMusicUserToken) {
  return {
    url: "/api/apple/connect",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        musicUserToken: input.musicUserToken,
        storefront: input.storefront
      })
    } satisfies RequestInit
  };
}

export async function connectAppleMusicWithMusicKit(
  fetcher: typeof fetch = fetch,
  prepared?: PreparedAppleMusicAuthorization
) {
  const { developerToken } = prepared ?? (await prepareAppleMusicAuthorization(fetcher));

  if (!window.MusicKit) {
    throw new Error("MusicKit is unavailable.");
  }

  const authorized = await getAuthorizedAppleMusicUserToken({
    musicKit: window.MusicKit,
    developerToken,
    appName: "OrganizeMyMusic",
    appBuild: "mvp"
  });
  const request = createAppleMusicConnectRequest(authorized);
  const response = await fetcher(request.url, request.init);

  if (!response.ok) {
    throw new Error("Unable to connect Apple Music.");
  }

  return z
    .object({
      status: z.literal("connected"),
      storefront: z.string()
    })
    .parse(await response.json());
}
