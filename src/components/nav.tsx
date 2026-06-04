"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Radar, ShieldAlert, Star, FolderKanban,
  Bot, Building2, Users, Crown, FileText, Sparkles,
  Globe, Plane, UserCog, Network, Scale, Bell, Siren, MessageSquareHeart,
  Trash2, Settings, Lock, Users2, TrendingUp, BadgeCheck,
  Gauge, FileLock2,
  LayoutGrid, Fingerprint, ShieldCheck,
  SlidersHorizontal, ChevronDown, Banknote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui";
import type { Feature } from "@/lib/billing/entitlements";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { group: string; items: NavItem[]; feature?: Feature; operator?: boolean };

// Information architecture organized around the protection lifecycle, not the
// org chart of features. Home = the two front doors; Command = the operator
// dashboards (to be merged into one Command Center); the OS groups own
// Discover→Act per domain; Governance owns Verify+Report. Item count is reduced
// in follow-up work by merging sibling pages into tabs — this step regroups and
// relabels without removing any route, so nothing breaks.
export const navGroups: NavGroup[] = [
  {
    group: "",
    items: [
      { href: "/dashboard/home", label: "Protection", icon: ShieldCheck },
      { href: "/dashboard/assistant", label: "AI Assistant", icon: MessageSquareHeart },
    ],
  },
  {
    // The operator dashboards — three views of the same posture. Slated to merge
    // into one role-adaptive Command Center.
    group: "Command",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/suite", label: "Protection Suite", icon: LayoutGrid },
      { href: "/dashboard/mission-control", label: "Mission Control", icon: Gauge },
    ],
  },
  {
    group: "PrivacyOS",
    items: [
      { href: "/dashboard/exposures", label: "Exposure Inventory", icon: Radar },
      { href: "/dashboard/identity", label: "Digital Identity", icon: Fingerprint },
      { href: "/dashboard/financial", label: "Financial Exposure", icon: Banknote },
      { href: "/dashboard/removals", label: "Broker Removals", icon: Trash2 },
      { href: "/dashboard/threats", label: "Threats", icon: ShieldAlert },
      { href: "/dashboard/cases", label: "Active Cases", icon: FolderKanban },
      { href: "/dashboard/recommendations", label: "AI Recommendations", icon: Sparkles },
    ],
  },
  {
    // ReputationOS pages already share one tab bar (ReputationTabs), so the
    // sidebar needs only the section entry — Growth, SEO, Media, Recovery,
    // Social, Intelligence and Campaigns are reached via those tabs (no nav lost).
    group: "ReputationOS",
    feature: "reputation",
    items: [
      { href: "/dashboard/reputation", label: "Reputation", icon: Star },
    ],
  },
  {
    // Every ExecutiveOS page already shares one tab bar (ExecutiveTabs), so the
    // sidebar needs only the section entry: Attack Paths, Residence, Doxxing,
    // Impersonation, Dark Web, Threat Actors and Command are reached via those
    // tabs (no navigation lost). Incidents (standalone IR), Family and Travel
    // keep direct entries since they serve their own personas.
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
    // Five surfaces — the agent fleet, playbooks, runtime command, builder and
    // templates — are one capability behind a single entry; the Automation page's
    // tab bar moves between them. Gated behind `automation`; standard plans get it
    // auto-configured (the autonomy dial is the real UI).
    group: "Automation",
    feature: "automation",
    items: [
      { href: "/dashboard/agents", label: "AI Agents", icon: Bot },
    ],
  },
  {
    // Verify + Report — the governance loop. Reports sits beside Compliance (its
    // SLA/control view); Evidence Vault beside the Audit Log (together the
    // append-only "Ledger" they're slated to merge into).
    group: "Governance",
    items: [
      { href: "/dashboard/reports", label: "Reports", icon: FileText },
      { href: "/dashboard/compliance", label: "Compliance & SLAs", icon: BadgeCheck },
      { href: "/dashboard/legal", label: "Legal Automation", icon: Scale },
      // Ledger = the two append-only record streams (Sealed Evidence + Audit Log)
      // behind one entry; LedgerTabs moves between them.
      { href: "/dashboard/evidence", label: "Ledger", icon: FileLock2 },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    group: "Operator",
    operator: true,
    items: [
      { href: "/dashboard/business-intelligence", label: "Growth & Revenue", icon: TrendingUp },
    ],
  },
];

/**
 * The ~6 outcome-first surfaces an ordinary customer sees by default. Everything
 * else is an operator/advanced tool, revealed only via the "Advanced" toggle.
 */
const CONSUMER_SURFACES = new Set<string>([
  "/dashboard/home",         // Protection
  "/dashboard/assistant",    // AI Assistant
  "/dashboard/exposures",    // Exposure Inventory
  "/dashboard/identity",     // Digital Identity
  "/dashboard/financial",    // Financial Exposure
  "/dashboard/removals",     // Broker Removals
  "/dashboard/reputation",   // Reputation overview
  "/dashboard/reports",      // Reports
  "/dashboard/notifications",
  "/dashboard/settings",
]);

const ADVANCED_PREF_KEY = "po_advanced";

/** The grouped nav list, shared by the desktop sidebar and the mobile drawer. */
export function NavList({
  lockedFeatures = [],
  isOperator = false,
  onNavigate,
}: {
  lockedFeatures?: Feature[];
  /** Operator/admin: reveals internal company consoles (e.g. Growth & Revenue). */
  isOperator?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isLocked = (f?: Feature) => f !== undefined && lockedFeatures.includes(f);

  // Default to the simple consumer view; remember the user's choice locally.
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => {
    try { setAdvanced(localStorage.getItem(ADVANCED_PREF_KEY) === "1"); } catch { /* ignore */ }
  }, []);
  function toggleAdvanced() {
    setAdvanced((v) => {
      const next = !v;
      try { localStorage.setItem(ADVANCED_PREF_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }

  // Mark only the most specific matching item active, so a parent ("Overview")
  // doesn't light up alongside its nested child ("Growth & Brand").
  const matches = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const activeHref = navGroups
    .flatMap((g) => g.items.map((i) => i.href))
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0];

  // In consumer view, show only the ~6 surfaces (and never a locked/upsell item);
  // in advanced view, show everything (locked items become upsells).
  const groups = navGroups
    .filter((g) => !g.operator || isOperator) // internal consoles: operators only
    .map((g) => ({
      ...g,
      items: advanced ? g.items : g.items.filter((it) => CONSUMER_SURFACES.has(it.href) && !isLocked(g.feature)),
    }))
    .filter((g) => g.items.length > 0);
  const allCount = navGroups.reduce((n, g) => n + g.items.length, 0);
  const shownCount = groups.reduce((n, g) => n + g.items.length, 0);
  const hiddenCount = allCount - shownCount;

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
      {groups.map((grp, gi) => {
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
              const active = item.href === activeHref;
              const href = locked ? "/pricing" : item.href;
              return (
                <Link
                  key={item.href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
                    locked
                      ? "text-slate-600 hover:bg-bg-elevated hover:text-slate-400"
                      : active
                        ? "bg-gradient-to-r from-brand/20 to-transparent text-white ring-1 ring-brand/25 before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-brand"
                        : "text-slate-400 hover:bg-bg-elevated hover:text-white",
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", active && "text-brand-fg")} />
                  <span className="flex-1">{item.label}</span>
                  {locked && <Lock className="h-3.5 w-3.5" />}
                </Link>
              );
            })}
          </div>
        );
      })}

      <button
        type="button"
        onClick={toggleAdvanced}
        className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-bg-elevated hover:text-slate-300"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">{advanced ? "Hide advanced tools" : "Advanced tools"}</span>
        {!advanced && hiddenCount > 0 && <span className="text-[10px] text-slate-600">{hiddenCount}</span>}
        <ChevronDown className={cn("h-3.5 w-3.5 transition", advanced ? "rotate-180" : "")} />
      </button>
    </nav>
  );
}
