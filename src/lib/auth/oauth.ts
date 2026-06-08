import { env } from "@/lib/env";

export type OAuthProvider = "apple" | "google";

type OAuthEnv = {
  AUTH_APPLE_OAUTH_ENABLED?: string;
  AUTH_GOOGLE_OAUTH_ENABLED?: string;
};

export type OAuthProviderAvailability = Record<
  OAuthProvider,
  {
    enabled: boolean;
    disabledReason: string | null;
  }
>;

function isEnabled(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true";
}

export function getOAuthProviderAvailability(values: OAuthEnv = env): OAuthProviderAvailability {
  const appleEnabled = isEnabled(values.AUTH_APPLE_OAUTH_ENABLED);
  const googleEnabled = isEnabled(values.AUTH_GOOGLE_OAUTH_ENABLED);

  return {
    apple: {
      enabled: appleEnabled,
      disabledReason: appleEnabled ? null : "Apple sign-in is not configured yet."
    },
    google: {
      enabled: googleEnabled,
      disabledReason: googleEnabled ? null : "Google sign-in is not configured yet."
    }
  };
}
