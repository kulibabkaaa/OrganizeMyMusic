import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseProfileWriter } from "@/lib/auth/profile";

export interface AuthUser {
  id: string;
  email?: string | null;
}

export interface AuthError {
  message?: string;
}

export interface SupabaseAuthReader {
  auth: {
    getUser(): Promise<{
      data: { user: AuthUser | null };
      error: AuthError | null;
    }>;
  };
}

export type SupabaseAppClient = SupabaseAuthReader & SupabaseProfileWriter;

export type AuthSessionResult<TClient extends SupabaseAuthReader = SupabaseAppClient> =
  | {
      status: "authenticated";
      user: AuthUser;
      supabase: TClient;
    }
  | {
      status: "signed_out" | "missing_config";
      user: null;
      supabase: TClient | null;
    };

export function getLandingCtaRoutes(status: AuthSessionResult["status"]) {
  if (status === "authenticated") {
    return {
      openAppHref: "/app",
      startSortHref: "/app"
    } as const;
  }

  return {
    openAppHref: "/auth",
    startSortHref: "/auth"
  } as const;
}

export async function getAuthenticatedSession<TClient extends SupabaseAuthReader>(
  client: TClient | null
): Promise<AuthSessionResult<TClient>>;
export async function getAuthenticatedSession(): Promise<AuthSessionResult<SupabaseAppClient>>;
export async function getAuthenticatedSession<TClient extends SupabaseAuthReader>(
  client?: TClient | null
): Promise<AuthSessionResult<TClient | SupabaseAppClient>> {
  const supabase = client ?? ((await createSupabaseServerClient()) as SupabaseAppClient | null);

  if (!supabase) {
    return {
      status: "missing_config",
      user: null,
      supabase: null
    };
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      status: "signed_out",
      user: null,
      supabase
    };
  }

  return {
    status: "authenticated",
    user,
    supabase
  };
}
