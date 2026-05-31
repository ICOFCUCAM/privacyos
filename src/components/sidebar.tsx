"use client";

import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import type { Feature } from "@/lib/billing/entitlements";
import { NavList } from "@/components/nav";

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
}: {
  subjectName?: string;
  live?: boolean;
  lockedFeatures?: Feature[];
}) {
  const name = subjectName ?? "Demo Subject";
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-bg-subtle/60 lg:flex lg:flex-col">
      <Link href="/" className="flex items-center gap-2 px-5 py-4">
        <Image src="/PrivacyLogo.png" alt="" width={28} height={28} className="h-7 w-7" />
        <span className="text-lg font-bold text-white">PrivacyOS</span>
      </Link>

      <NavList lockedFeatures={lockedFeatures} />

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-muted text-sm font-semibold text-brand-fg">
            {initialsOf(name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-xs text-slate-500">{live ? "Executive plan" : "Demo mode"}</p>
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
