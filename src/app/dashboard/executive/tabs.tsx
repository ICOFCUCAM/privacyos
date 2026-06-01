"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Home, UserX, Crosshair, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui";

export const EXECUTIVE_TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/executive", label: "Overview", icon: Crown },
  { href: "/dashboard/executive/residence", label: "Residence", icon: Home },
  { href: "/dashboard/executive/doxxing", label: "Doxxing", icon: UserX },
  { href: "/dashboard/executive/threat-actors", label: "Threat Actors", icon: Crosshair },
  { href: "/dashboard/executive/command", label: "Command", icon: LayoutGrid },
];

export function ExecutiveTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
      {EXECUTIVE_TABS.map((t) => {
        const active = pathname === t.href;
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
