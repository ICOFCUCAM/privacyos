"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Workflow, GitBranch, Blocks, LayoutTemplate } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui";

/**
 * Section nav for the Automation surfaces. These five pages are one capability
 * at different abstraction levels — the agent fleet, the declarative playbooks,
 * the runtime command center, the visual builder and the template packs — so the
 * sidebar shows a single "Automation" entry and this tab bar moves between them.
 */
export const AUTOMATION_TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/agents", label: "AI Agents", icon: Bot },
  { href: "/dashboard/playbooks", label: "Playbooks", icon: Workflow },
  { href: "/dashboard/workflows", label: "Command", icon: GitBranch },
  { href: "/dashboard/workflow-builder", label: "Builder", icon: Blocks },
  { href: "/dashboard/automation-templates", label: "Templates", icon: LayoutTemplate },
];

export function AutomationTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
      {AUTOMATION_TABS.map((t) => {
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
