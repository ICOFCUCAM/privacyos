"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
}

export type OAuthProvider = "google" | "azure";

/** Best-effort origin for OAuth redirect URLs (env override, else request host). */
async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Start an OAuth (SSO) sign-in. Generates the provider authorize URL with PKCE
 * (the verifier is stored in a cookie by the server client) and redirects the
 * user to the provider; they return to /auth/callback to exchange the code.
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/login?error=Auth%20is%20not%20configured");

  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/callback?next=/dashboard` },
  });
  if (error || !data?.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Could not start sign-in")}`);
  }
  redirect(data.url);
}

/** Form-action wrappers (server actions must be passed directly to <form action>). */
export async function signInWithGoogle(): Promise<void> {
  await signInWithProvider("google");
}
export async function signInWithMicrosoft(): Promise<void> {
  await signInWithProvider("azure");
}

/** Email + password sign-in. Redirects to the dashboard on success. */
export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Auth is not configured. Explore the demo dashboard instead." };
  }
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard") || "/dashboard";

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: "Auth is not configured." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect(next);
}

/** Email + password sign-up. */
export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Auth is not configured. Explore the demo dashboard instead." };
  }
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: "Auth is not configured." };

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  return { message: "Check your email to confirm your account, then sign in." };
}

/** Sign the user out and return to the landing page. */
export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
