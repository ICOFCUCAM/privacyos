"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Radar, ShieldAlert, Star, FolderKanban,
  Bot, Building2, Users, Crown, FileText, Sparkles,
  Globe, Plane, UserCog, Network, Scale, Bell, Siren, MessageSquareHeart,
  Trash2, ScrollText, Settings, Lock, Users2, TrendingUp, Workflow, BadgeCheck, GitBranch, Blocks,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui";
import type { Feature } from "@/lib/billing/entitlements";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { group: string; items: NavItem[]; feature?: Feature };

export const navGroups: NavGroup[] = [
  { group: "", items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }] },
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
  { group: "ReputationOS", feature: "reputation", items: [{ href: "/dashboard/reputation", label: "Reputation", icon: Star }] },
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
      { href: "/dashboard/workflows", label: "Workflow Command", icon: GitBranch },
      { href: "/dashboard/workflow-builder", label: "Workflow Builder", icon: Blocks },
      { href: "/dashboard/playbooks", label: "Response Playbooks", icon: Workflow },
      { href: "/dashboard/legal", label: "Legal Automation", icon: Scale },
      { href: "/dashboard/reports", label: "Reports", icon: FileText },
      { href: "/dashboard/compliance", label: "Compliance & SLAs", icon: BadgeCheck },
      { href: "/dashboard/audit", label: "Audit Log", icon: ScrollText },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    group: "Operator",
    items: [
      { href: "/dashboard/business-intelligence", label: "Growth & Revenue", icon: TrendingUp },
    ],
  },
];

/** The grouped nav list, shared by the desktop sidebar and the mobile drawer. */
export function NavList({
  lockedFeatures = [],
  onNavigate,
}: {
  lockedFeatures?: Feature[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isLocked = (f?: Feature) => f !== undefined && lockedFeatures.includes(f);

  return (
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
                item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
              const href = locked ? "/pricing" : item.href;
              return (
                <Link
                  key={item.href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
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
  );
}
