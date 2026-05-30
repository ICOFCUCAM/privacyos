"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield, LayoutDashboard, Radar, ShieldAlert, Star, FolderKanban,
  Bot, Building2, Users, Crown, FileText, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/ui";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/exposures", label: "Exposure Inventory", icon: Radar },
  { href: "/dashboard/threats", label: "Threat Feed", icon: ShieldAlert },
  { href: "/dashboard/reputation", label: "Reputation", icon: Star },
  { href: "/dashboard/cases", label: "Active Cases", icon: FolderKanban },
  { href: "/dashboard/recommendations", label: "AI Recommendations", icon: Sparkles },
  { href: "/dashboard/agents", label: "AI Agents", icon: Bot },
  { href: "/dashboard/executive", label: "Executive Protection", icon: Crown },
  { href: "/dashboard/family", label: "Family Protection", icon: Users },
  { href: "/dashboard/business", label: "Business Intelligence", icon: Building2 },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-bg-subtle/60 lg:flex lg:flex-col">
      <Link href="/" className="flex items-center gap-2 px-5 py-5">
        <Shield className="h-6 w-6 text-brand" />
        <span className="text-lg font-bold text-white">PrivacyOS</span>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand/15 text-white ring-1 ring-brand/30"
                  : "text-slate-400 hover:bg-bg-elevated hover:text-white",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-muted text-sm font-semibold text-brand-fg">
            JV
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">Jordan Vance</p>
            <p className="truncate text-xs text-slate-500">Executive plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
