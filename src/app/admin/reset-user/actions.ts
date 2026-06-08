"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createPgBossUserJobStore,
  createSupabaseUserResetStore,
  executeUserDataReset
} from "@/modules/admin/user-reset";

export async function requestUserResetPreviewAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/admin/reset-user?status=invalid_email");
  }

  redirect(`/admin/reset-user?email=${encodeURIComponent(email)}`);
}

export async function executeUserResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const confirmation = String(formData.get("confirmation") ?? "");
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    redirect("/auth");
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    redirect(buildResetRedirect({ email, status: "service_role_missing" }));
  }

  const store = createSupabaseUserResetStore(supabase);
  const result =
    (await withPgBoss((boss) =>
      executeUserDataReset({
        store,
        pgBossJobs: createPgBossUserJobStore(boss),
        requesterUserId: session.user.id,
        email,
        confirmation
      })
    )) ??
    (await executeUserDataReset({
      store,
      pgBossJobs: null,
      requesterUserId: session.user.id,
      email,
      confirmation
    }));

  if (result.status === "deleted") {
    redirect(
      `/admin/reset-user?status=deleted&jobs=${encodeURIComponent(String(result.deletedPgBossJobCount))}`
    );
  }

  redirect(buildResetRedirect({ email, status: result.status }));
}

function buildResetRedirect(input: { email: string; status: string }): Route {
  const params = new URLSearchParams({
    status: input.status
  });

  if (input.email) {
    params.set("email", input.email);
  }

  return `/admin/reset-user?${params.toString()}` as Route;
}
