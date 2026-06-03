"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import type { Feature } from "@/lib/billing/entitlements";
import { NavList } from "@/components/nav";
import { BrandMark } from "@/components/brand-mark";

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("") || "PO"
  );
}

export function Sidebar({
  subjectName,
  live,
  lockedFeatures = [],
  isOperator = false,
  planLabel,
}: {
  subjectName?: string;
  live?: boolean;
  lockedFeatures?: Feature[];
  isOperator?: boolean;
  planLabel?: string;
}) {
  const name = subjectName ?? "Demo Subject";
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-gradient-to-b from-bg-subtle/80 to-bg-subtle/40 lg:flex">
      <div className="border-b border-border/60 px-5 py-4">
        <BrandMark size={30} />
      </div>

      <NavList lockedFeatures={lockedFeatures} isOperator={isOperator} />

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-xl bg-bg-elevated/40 p-2.5 ring-1 ring-border/60">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-fg/70 text-sm font-semibold text-white ring-1 ring-white/10">
            {initialsOf(name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-[11px] text-slate-500">{live ? (planLabel ?? "Free plan") : "Demo mode"}</p>
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
