"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseEmailPasswordForm } from "@/lib/auth/credentials";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectWithMessage(message: string): never {
  redirect(`/login?message=${encodeURIComponent(message)}`);
}

async function getActionClient() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithMessage("Supabase is not configured yet.");
  }

  return supabase;
}

export async function signInWithPassword(formData: FormData) {
  const parsed = parseEmailPasswordForm(formData);

  if (!parsed.success) {
    redirectWithMessage("Enter a valid email and password.");
  }

  const supabase = await getActionClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirectWithMessage(error.message);
  }

  revalidatePath("/", "layout");
  redirect("/app");
}

export async function signUpWithPassword(formData: FormData) {
  const parsed = parseEmailPasswordForm(formData);

  if (!parsed.success) {
    redirectWithMessage("Enter a valid email and an 8+ character password.");
  }

  const supabase = await getActionClient();
  const { error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    redirectWithMessage(error.message);
  }

  revalidatePath("/", "layout");
  redirect("/app");
}

async function signInWithOAuthProvider(provider: "apple" | "google") {
  const supabase = await getActionClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`
    }
  });

  if (error || !data.url) {
    redirectWithMessage(error?.message ?? "OAuth sign-in is unavailable.");
  }

  redirect(data.url as Parameters<typeof redirect>[0]);
}

export async function signInWithApple() {
  await signInWithOAuthProvider("apple");
}

export async function signInWithGoogle() {
  await signInWithOAuthProvider("google");
}
