"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge, TrendingUp, Search, Newspaper, LifeBuoy, Share2, Sparkles, Rocket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui";

export const REPUTATION_TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/reputation", label: "Overview", icon: Gauge },
  { href: "/dashboard/reputation/growth", label: "Growth", icon: TrendingUp },
  { href: "/dashboard/reputation/seo", label: "SEO", icon: Search },
  { href: "/dashboard/reputation/media", label: "Media", icon: Newspaper },
  { href: "/dashboard/reputation/recovery", label: "Recovery", icon: LifeBuoy },
  { href: "/dashboard/reputation/social", label: "Social", icon: Share2 },
  { href: "/dashboard/reputation/intelligence", label: "Intelligence", icon: Sparkles },
  { href: "/dashboard/reputation/campaigns", label: "Campaigns", icon: Rocket },
];

export function ReputationTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
      {REPUTATION_TABS.map((t) => {
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
