import type { AuthUser } from "@/lib/auth/session";

interface QueryError {
  code?: string;
  message?: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  isAdmin: boolean;
}

export interface SupabaseProfileWriter {
  from(table: "profiles"): {
    upsert(
      value: { id: string; email: string | null },
      options: { onConflict: "id" }
    ): {
      select(columns: "id,email,is_admin"): {
        single(): PromiseLike<{
          data: { id: string; email: string | null; is_admin: boolean } | null;
          error: QueryError | null;
        }>;
      };
    };
  };
}

export type EnsureProfileResult =
  | { status: "ready"; profile: UserProfile }
  | { status: "schema_missing"; profile: null }
  | { status: "service_role_missing"; profile: null }
  | { status: "error"; profile: null; message: string };

export function isMissingProfilesTableError(error: QueryError | null | undefined) {
  if (!error) {
    return false;
  }

  return error.code === "42P01" || /relation .*profiles.* does not exist/i.test(error.message ?? "");
}

export async function ensureProfileForUser(
  supabase: SupabaseProfileWriter | null,
  user: AuthUser
): Promise<EnsureProfileResult> {
  if (!supabase) {
    return {
      status: "service_role_missing",
      profile: null
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email ?? null
      },
      { onConflict: "id" }
    )
    .select("id,email,is_admin")
    .single();

  if (isMissingProfilesTableError(error)) {
    return {
      status: "schema_missing",
      profile: null
    };
  }

  if (error || !data) {
    return {
      status: "error",
      profile: null,
      message: error?.message ?? "Unable to create profile."
    };
  }

  return {
    status: "ready",
    profile: {
      id: data.id,
      email: data.email,
      isAdmin: data.is_admin
    }
  };
}
