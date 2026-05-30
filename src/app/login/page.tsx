import Link from "next/link";
import { Shield } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <main className="bg-grid flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <Shield className="h-6 w-6 text-brand" />
          <span className="text-lg font-bold text-white">PrivacyOS</span>
        </Link>
        <div className="rounded-2xl border border-border bg-bg-elevated/60 p-6 backdrop-blur">
          <h1 className="mb-1 text-xl font-semibold text-white">Welcome back</h1>
          <p className="mb-6 text-sm text-slate-400">
            Sign in to your protection dashboard.
          </p>
          <LoginForm next={next ?? "/dashboard"} configured={configured} />
        </div>
      </div>
    </main>
  );
}
