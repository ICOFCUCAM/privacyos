"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
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
