"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck, Search, Loader2, AlertTriangle, ArrowRight, Database, Skull, Globe,
  Fingerprint, UserX, CheckCircle2, Sparkles, Eye, ScanLine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/ui";
import type { MirrorCategory, RiskTone, ScaryMirrorReport } from "./types";
import { runScaryMirrorAction } from "./actions";

const CATEGORY_ICON: Record<MirrorCategory, LucideIcon> = {
  brokers: Database, breaches: AlertTriangle, darkweb: Skull, reputation: Globe, identity: Fingerprint, social: UserX,
};

const SEVERITY_CLS: Record<RiskTone, string> = {
  low: "text-risk-low ring-risk-low/30 bg-risk-low/10",
  medium: "text-risk-medium ring-risk-medium/30 bg-risk-medium/10",
  high: "text-risk-high ring-risk-high/30 bg-risk-high/10",
  critical: "text-risk-high ring-risk-high/30 bg-risk-high/10",
};

type Phase = "intro" | "scanning" | "reveal";

export function ScaryMirror({ defaultName }: { defaultName: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [name, setName] = useState(defaultName);
  const [report, setReport] = useState<ScaryMirrorReport | null>(null);
  const [logIndex, setLogIndex] = useState(0);
  const [pending, start] = useTransition();

  function runScan() {
    const n = name.trim();
    if (!n) return;
    setPhase("scanning");
    setLogIndex(0);
    start(async () => {
      const r = await runScaryMirrorAction(n);
      setReport(r);
    });
  }

  // Reveal scan-log lines one at a time; advance to the reveal once the report
  // is back AND the log has fully played (so the drama lands).
  useEffect(() => {
    if (phase !== "scanning" || !report) return;
    if (logIndex >= report.scanLog.length) { const t = setTimeout(() => setPhase("reveal"), 500); return () => clearTimeout(t); }
    const t = setTimeout(() => setLogIndex((i) => i + 1), 650);
    return () => clearTimeout(t);
  }, [phase, report, logIndex]);

  if (phase === "intro") {
    return (
      <Card className="mx-auto max-w-lg p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand"><ScanLine className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-bold text-white">See what&rsquo;s exposed about you</h2>
            <p className="text-xs text-slate-500">We&rsquo;ll scan 60+ sources in seconds. No setup.</p>
          </div>
        </div>
        <label className="mt-5 block space-y-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runScan(); }}
            placeholder="e.g. Jordan Avery"
            className="w-full rounded-lg border border-border bg-bg-subtle/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-brand/50 focus:outline-none"
          />
        </label>
        <button onClick={runScan} disabled={!name.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
          <Search className="h-4 w-4" /> Scan my exposure
        </button>
        <p className="mt-3 text-center text-[11px] text-slate-600">Read-only. We don&rsquo;t change anything until you say go.</p>
      </Card>
    );
  }

  if (phase === "scanning") {
    return (
      <Card className="mx-auto max-w-lg p-6">
        <div className="flex items-center gap-2.5">
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
          <h2 className="text-lg font-bold text-white">Scanning…</h2>
        </div>
        <ul className="mt-5 space-y-2">
          {(report?.scanLog ?? defaultLog(name)).slice(0, logIndex + 1).map((line, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
              {i < logIndex
                ? <CheckCircle2 className="h-4 w-4 shrink-0 text-risk-low" />
                : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />}
              {line}
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  // reveal
  if (!report) return null;
  const sev = report.worst?.severity ?? "low";
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* The mirror */}
      <Card className={cn("p-6 ring-1", SEVERITY_CLS[sev].split(" ").find((c) => c.startsWith("ring")) ?? "ring-border")}>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <Eye className="h-3.5 w-3.5 text-brand" /> Your exposure report
        </div>
        <p className="mt-2 text-2xl font-bold leading-tight text-white">{report.headline}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div>
            <p className="text-4xl font-black text-risk-high">{report.exposureScore}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Exposure score</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-slate-300"><b className="text-white">{report.totalFindings}</b> findings</span>
            <span className="text-slate-300"><b className="text-white">{report.categoriesAffected}</b> categories</span>
            <span className="text-slate-300"><b className="text-white">{report.sourcesScanned}+</b> sources scanned</span>
          </div>
        </div>
      </Card>

      {/* Findings */}
      <div className="space-y-2">
        {report.findings.map((f) => {
          const Icon = CATEGORY_ICON[f.category];
          return (
            <Card key={f.category} className="flex items-center gap-3 p-3.5">
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1", SEVERITY_CLS[f.severity])}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1", SEVERITY_CLS[f.severity])}>{f.severity}</span>
                </div>
                <p className="truncate text-[11px] text-slate-500">{f.samples.join(" · ")}{f.count > f.samples.length ? ` +${f.count - f.samples.length} more` : ""}</p>
              </div>
              <span className="shrink-0 text-2xl font-bold text-white">{f.count}</span>
            </Card>
          );
        })}
      </div>

      {/* …and we're already fixing it */}
      <Card className="border-brand/30 bg-brand/10 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <Sparkles className="h-4 w-4 text-brand" /> …and we&rsquo;re already fixing it
        </p>
        <ul className="mt-3 space-y-1.5">
          {report.fixPlan.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-[13px] text-slate-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-risk-low" /> {s.label} <span className="text-slate-500">· {s.detail}</span>
            </li>
          ))}
        </ul>
        <Link href="/dashboard/home" className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand/90">
          <ShieldCheck className="h-4 w-4" /> Start my protection <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  );
}

function defaultLog(name: string): string[] {
  return [
    `Scanning 60+ data-broker sites for ${name || "you"}…`,
    "Checking known breach databases…",
    "Searching dark-web markets & forums…",
    "Auditing page-one search & news results…",
    "Checking for impersonation & deepfakes…",
    "Compiling your exposure report…",
  ];
}
