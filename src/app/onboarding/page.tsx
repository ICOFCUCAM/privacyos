import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { OnboardingForm } from "@/components/onboarding-form";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  // Onboarding only applies to live, signed-in users with no subject yet.
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/dashboard");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase.from("subjects").select("id").limit(1).maybeSingle();
  if (existing) redirect("/dashboard");

  return (
    <main className="bg-grid flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Shield className="h-6 w-6 text-brand" />
          <span className="text-lg font-bold text-white">PrivacyOS</span>
        </div>
        <div className="rounded-2xl border border-border bg-bg-elevated/60 p-7 backdrop-blur">
          <h1 className="text-xl font-semibold text-white">Set up your protection</h1>
          <p className="mb-6 mt-1 text-sm text-slate-400">
            Tell us who and what to watch. The agent fleet will start discovering exposures
            immediately and monitor continuously.
          </p>
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
