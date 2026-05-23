import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

export function createSupabaseServiceRoleClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  if (typeof window !== "undefined") {
    throw new Error("Service role Supabase client is server-only.");
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
