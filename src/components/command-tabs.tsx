"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LayoutGrid, Gauge } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui";

/**
 * Section nav for the Command surfaces — three operator views of the same
 * posture (the classic Overview, the Protection Suite grid, and Mission
 * Control's cross-domain queue). One sidebar entry, three tabs. A future
 * role-adaptive console can replace these tabs with a single view that adapts to
 * the customer's tier.
 */
export const COMMAND_TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/suite", label: "Protection Suite", icon: LayoutGrid },
  { href: "/dashboard/mission-control", label: "Mission Control", icon: Gauge },
];

export function CommandTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
      {COMMAND_TABS.map((t) => {
        // /dashboard is the index — match it exactly so it doesn't light up everywhere.
        const active = t.href === "/dashboard" ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
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
