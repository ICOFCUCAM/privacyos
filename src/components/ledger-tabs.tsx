"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileLock2, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui";

/**
 * Section nav for the Ledger — the platform's two append-only record streams.
 * Sealed Evidence is the forensic, SHA-256-sealed chain of custody; the Audit
 * Log is the chronological actor/action trail. One sidebar entry, two tabs.
 */
export const LEDGER_TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/evidence", label: "Sealed Evidence", icon: FileLock2 },
  { href: "/dashboard/audit", label: "Audit Log", icon: ScrollText },
];

export function LedgerTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
      {LEDGER_TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition",
              active ? "bg-brand/15 text-white ring-brand/30" : "bg-bg-elevated text-slate-400 ring-border hover:text-white",
            )}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </Link>
        );
      })}
    </div>
  );
}
