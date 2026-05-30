"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateSubject, type SettingsState } from "@/app/dashboard/settings/actions";
import type { Subject } from "@/lib/types";

const field =
  "w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-white outline-none focus:border-brand";

export function SubjectSettingsForm({ subject, live }: { subject: Subject; live: boolean }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateSubject, {});

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={subject.id} />

      {!live && (
        <div className="rounded-lg border border-risk-medium/30 bg-risk-medium/10 px-3 py-2 text-xs text-risk-medium">
          Demo mode — changes are validated but not persisted. Connect Supabase to save.
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Display name *</label>
        <input name="displayName" required defaultValue={subject.displayName} className={field} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Protection profile</label>
        <select name="type" defaultValue={subject.type} className={field}>
          <option value="individual">Individual</option>
          <option value="executive">Executive / VIP</option>
          <option value="family_member">Family member</option>
          <option value="business">Business / Organization</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Emails (one per line)</label>
          <textarea name="emails" rows={3} defaultValue={subject.emails.join("\n")} className={field} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Phone numbers (one per line)</label>
          <textarea name="phones" rows={3} defaultValue={subject.phones.join("\n")} className={field} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Usernames / handles (one per line)</label>
          <textarea name="usernames" rows={2} defaultValue={subject.usernames.join("\n")} className={field} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Organization</label>
          <input name="organization" defaultValue={subject.organization ?? ""} className={field} />
        </div>
      </div>

      {state.error && <p className="text-sm text-risk-critical">{state.error}</p>}
      {state.message && <p className="text-sm text-risk-low">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
