"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, BadgeCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui";

/**
 * Section nav for Governance reporting — the generated reports (privacy,
 * executive, board, …) and the live compliance/SLA posture are two views of the
 * same Report stage, so they share one sidebar entry and this tab bar.
 */
export const REPORTS_TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/compliance", label: "Compliance & SLAs", icon: BadgeCheck },
];

export function ReportsTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
      {REPORTS_TABS.map((t) => {
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
