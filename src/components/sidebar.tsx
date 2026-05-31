"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield, LayoutDashboard, Radar, ShieldAlert, Star, FolderKanban,
  Bot, Building2, Users, Crown, FileText, Sparkles, LogOut,
  Globe, Plane, UserCog, Network, Scale, Bell, Siren, MessageSquareHeart, Trash2, ScrollText, Settings, Lock, Users2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui";
import { signOut } from "@/app/auth/actions";
import type { Feature } from "@/lib/billing/entitlements";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { group: string; items: NavItem[]; feature?: Feature };
const navGroups: NavGroup[] = [
  {
    group: "",
    items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }],
  },
  {
    group: "PrivacyOS",
    items: [
      { href: "/dashboard/assistant", label: "AI Assistant", icon: MessageSquareHeart },
      { href: "/dashboard/exposures", label: "Exposure Inventory", icon: Radar },
      { href: "/dashboard/removals", label: "Broker Removals", icon: Trash2 },
      { href: "/dashboard/threats", label: "Threat Feed", icon: ShieldAlert },
      { href: "/dashboard/cases", label: "Active Cases", icon: FolderKanban },
      { href: "/dashboard/recommendations", label: "AI Recommendations", icon: Sparkles },
    ],
  },
  {
    group: "ReputationOS",
    feature: "reputation",
    items: [{ href: "/dashboard/reputation", label: "Reputation", icon: Star }],
  },
  {
    group: "ExecutiveOS",
    feature: "executive",
    items: [
      { href: "/dashboard/executive", label: "Executive Protection", icon: Crown },
      { href: "/dashboard/incidents", label: "Incidents", icon: Siren },
      { href: "/dashboard/family", label: "Family Protection", icon: Users },
      { href: "/dashboard/travel", label: "Travel Risk", icon: Plane },
    ],
  },
  {
    group: "BusinessOS",
    feature: "business",
    items: [
      { href: "/dashboard/business", label: "Business Intelligence", icon: Building2 },
      { href: "/dashboard/domains", label: "Domains", icon: Globe },
      { href: "/dashboard/employees", label: "Employee Exposure", icon: UserCog },
      { href: "/dashboard/third-party", label: "Third-Party Risk", icon: Network },
      { href: "/dashboard/team", label: "Team & Roles", icon: Users2 },
    ],
  },
  {
    group: "Automation",
    items: [
      { href: "/dashboard/agents", label: "AI Agents", icon: Bot },
      { href: "/dashboard/legal", label: "Legal Automation", icon: Scale },
      { href: "/dashboard/reports", label: "Reports", icon: FileText },
      { href: "/dashboard/audit", label: "Audit Log", icon: ScrollText },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar({
  subjectName,
  live,
  lockedFeatures = [],
}: {
  subjectName?: string;
  live?: boolean;
  lockedFeatures?: Feature[];
}) {
  const pathname = usePathname();
  const isLocked = (f?: Feature) => f !== undefined && lockedFeatures.includes(f);
  const name = subjectName ?? "Demo Subject";
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("") || "PO";
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-bg-subtle/60 lg:flex lg:flex-col">
      <Link href="/" className="flex items-center gap-2 px-5 py-5">
        <Shield className="h-6 w-6 text-brand" />
        <span className="text-lg font-bold text-white">PrivacyOS</span>
      </Link>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {navGroups.map((grp, gi) => {
          const locked = isLocked(grp.feature);
          return (
          <div key={gi} className="space-y-1">
            {grp.group && (
              <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                {grp.group}
                {locked && <Lock className="h-3 w-3" />}
              </p>
            )}
            {grp.items.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              // Locked suites link to the upgrade page instead of the gated route.
              const href = locked ? "/pricing" : item.href;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                    locked
                      ? "text-slate-600 hover:bg-bg-elevated hover:text-slate-400"
                      : active
                        ? "bg-brand/15 text-white ring-1 ring-brand/30"
                        : "text-slate-400 hover:bg-bg-elevated hover:text-white",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {locked && <Lock className="h-3.5 w-3.5" />}
                </Link>
              );
            })}
          </div>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-muted text-sm font-semibold text-brand-fg">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-xs text-slate-500">
              {live ? "Executive plan" : "Demo mode"}
            </p>
          </div>
          {live && (
            <form action={signOut}>
              <button
                type="submit"
                title="Sign out"
                className="rounded-md p-1.5 text-slate-500 transition hover:bg-bg-elevated hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
