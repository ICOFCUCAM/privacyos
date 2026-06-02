"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useLocale, useT, persistLocale } from "@/lib/i18n/provider";

/** Language picker. Persists to a cookie and refreshes so the server re-renders. */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  function change(next: Locale) {
    if (next === locale) return;
    persistLocale(next);
    start(() => router.refresh());
  }

  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-slate-400" title={t("lang.label")}>
      <Languages className="h-3.5 w-3.5" aria-hidden />
      {!compact && <span className="sr-only">{t("lang.label")}</span>}
      <select
        value={locale}
        onChange={(e) => change(e.target.value as Locale)}
        disabled={pending}
        aria-label={t("lang.label")}
        className="rounded-md border border-border bg-bg-subtle px-2 py-1 text-xs text-white focus:border-brand/50 focus:outline-none disabled:opacity-60"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>{l.flag} {compact ? l.code.toUpperCase() : l.native}</option>
        ))}
      </select>
    </label>
  );
}
