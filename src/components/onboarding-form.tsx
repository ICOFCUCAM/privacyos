"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { createSubject, type OnboardingState } from "@/app/onboarding/actions";

const field =
  "w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-white outline-none focus:border-brand";

export function OnboardingForm({
  defaultName = "",
  defaultType = "individual",
}: {
  defaultName?: string;
  defaultType?: string;
}) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createSubject, {});

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Who are we protecting? *</label>
        <input name="displayName" required defaultValue={defaultName} placeholder="e.g. Jordan Vance" className={field} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Protection profile</label>
        <select name="type" defaultValue={defaultType} className={field}>
          <option value="individual">Individual</option>
          <option value="executive">Executive / VIP</option>
          <option value="family_member">Family member</option>
          <option value="business">Business / Organization</option>
        </select>
      </div>

      {/* Everything below is optional — the agents discover most of this on their
          own. Tucked away so a non-technical customer can activate in one tap. */}
      <details className="group rounded-lg border border-border bg-bg-subtle/30 px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-300">
          Add details to find more (optional)
          <span className="text-slate-500 transition group-open:rotate-45">+</span>
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Emails (one per line)</label>
              <textarea name="emails" rows={3} placeholder="you@example.com" className={field} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Phone numbers (one per line)</label>
              <textarea name="phones" rows={3} placeholder="+1 (555) 555-0100" className={field} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Usernames / handles (one per line)</label>
              <textarea name="usernames" rows={2} placeholder="jvance" className={field} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Organization (optional)</label>
              <input name="organization" placeholder="Vance Capital" className={field} />
            </div>
          </div>
        </div>
      </details>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" name="runScan" defaultChecked className="h-4 w-4 rounded border-border bg-bg-subtle" />
        Run an initial discovery scan now
      </label>

      {state.error && <p className="text-sm text-risk-critical">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
      >
        <ShieldCheck className="h-4 w-4" />
        {pending ? "Setting up your protection…" : "Start protecting"}
      </button>
    </form>
  );
}
