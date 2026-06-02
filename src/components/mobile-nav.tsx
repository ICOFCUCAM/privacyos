"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Menu, X, LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/ui";
import type { Feature } from "@/lib/billing/entitlements";
import { NavList } from "@/components/nav";

/** Top bar + slide-over drawer for navigation on screens below lg. */
export function MobileNav({
  subjectName,
  live,
  lockedFeatures = [],
  isOperator = false,
}: {
  subjectName?: string;
  live?: boolean;
  lockedFeatures?: Feature[];
  isOperator?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change.
  useEffect(() => setOpen(false), [pathname]);
  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/80 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand" />
          <span className="text-base font-bold text-white">PrivacyOS</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="rounded-md p-2 text-slate-300 transition hover:bg-bg-elevated hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col border-r border-border bg-bg-subtle transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand" />
            <span className="text-base font-bold text-white">PrivacyOS</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-bg-elevated hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <NavList lockedFeatures={lockedFeatures} isOperator={isOperator} onNavigate={() => setOpen(false)} />

        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{subjectName ?? "Demo Subject"}</p>
              <p className="truncate text-xs text-slate-500">{live ? "Executive plan" : "Demo mode"}</p>
            </div>
            {live && (
              <form action={signOut}>
                <button type="submit" title="Sign out" className="rounded-md p-1.5 text-slate-500 transition hover:bg-bg-elevated hover:text-white">
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
