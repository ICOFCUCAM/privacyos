"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";

export function LoginForm({ next, configured }: { next: string; configured: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {!configured && (
        <div className="rounded-lg border border-risk-medium/30 bg-risk-medium/10 px-3 py-2 text-xs text-risk-medium">
          Auth isn&apos;t configured in this environment. Add Supabase keys to enable
          accounts, or{" "}
          <Link href="/dashboard" className="underline">
            explore the demo dashboard
          </Link>
          .
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-white outline-none focus:border-brand"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-white outline-none focus:border-brand"
          placeholder="••••••••"
        />
      </div>

      {state.error && <p className="text-xs text-risk-critical">{state.error}</p>}
      {state.message && <p className="text-xs text-risk-low">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
      >
        {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>

      <p className="text-center text-xs text-slate-500">
        {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="font-medium text-brand-fg hover:underline"
        >
          {mode === "signin" ? "Create one" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
