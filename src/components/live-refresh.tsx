"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/ui";

/**
 * Keeps a server-rendered console feeling alive: on a fixed interval it calls
 * router.refresh(), which re-runs the page's server component and streams in
 * fresh data without a full navigation. Renders a small live indicator with the
 * seconds-since-refresh, and pauses while the tab is hidden to avoid wasted work.
 */
export function LiveRefresh({
  intervalMs = 30_000,
  label = "Live",
}: {
  intervalMs?: number;
  label?: string;
}) {
  const router = useRouter();
  const [secs, setSecs] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const lastRef = useRef(Date.now());

  useEffect(() => {
    const tick = setInterval(() => {
      setSecs(Math.floor((Date.now() - lastRef.current) / 1000));
    }, 1000);

    const refresh = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setRefreshing(true);
      router.refresh();
      lastRef.current = Date.now();
      setSecs(0);
      // brief spinner; the server round-trip resolves quickly in practice
      setTimeout(() => setRefreshing(false), 600);
    }, intervalMs);

    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [intervalMs, router]);

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1.5 text-xs font-medium text-slate-300">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-low opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-risk-low" />
      </span>
      <span className="text-risk-low">{label}</span>
      <span className="text-slate-500">· updated {secs === 0 ? "now" : `${secs}s ago`}</span>
      <RefreshCw className={cn("h-3 w-3 text-slate-500", refreshing && "animate-spin")} />
    </span>
  );
}
