/**
 * Reporting engine.
 *
 * Renders standalone, print-ready HTML reports (privacy, executive, business,
 * threat, compliance, risk, board). Browsers can "Save as PDF" from the output,
 * so this is a production-ready export today; a server-side PDF renderer can be
 * dropped in behind the same `renderReport` interface later.
 */

import type { ReportType, ScoreSet } from "@/lib/suite-types";

export interface ReportContext {
  type: ReportType;
  subjectName: string;
  organization?: string;
  generatedAt: string;
  scores: ScoreSet;
  stats: { label: string; value: string | number }[];
  sections: { heading: string; rows: { label: string; value: string }[] }[];
}

export const REPORT_TITLES: Record<ReportType, string> = {
  privacy: "Privacy Report",
  executive: "Executive Protection Report",
  family: "Family Protection Report",
  travel: "Travel Security Report",
  identity: "Digital Identity Report",
  business: "Business Risk Report",
  threat: "Threat Intelligence Report",
  compliance: "Compliance Report",
  risk: "Risk Assessment Report",
  board: "Board Briefing",
};

function band(score: number): string {
  if (score >= 75) return "Critical";
  if (score >= 50) return "High";
  if (score >= 25) return "Medium";
  return "Low";
}

function bandColor(score: number): string {
  if (score >= 75) return "#ef4444";
  if (score >= 50) return "#f97316";
  if (score >= 25) return "#eab308";
  return "#22c55e";
}

export function renderReport(ctx: ReportContext): string {
  const title = REPORT_TITLES[ctx.type];
  const scoreCards = (
    [
      ["Overall", ctx.scores.overall],
      ["Privacy", ctx.scores.privacy],
      ["Identity", ctx.scores.identity],
      ["Reputation", ctx.scores.reputation],
      ["Executive", ctx.scores.executive],
      ["Business", ctx.scores.business],
    ] as const
  )
    .map(
      ([label, value]) => `
      <div class="score">
        <div class="score-val" style="color:${bandColor(value)}">${value}</div>
        <div class="score-label">${label}</div>
        <div class="score-band" style="color:${bandColor(value)}">${band(value)}</div>
      </div>`,
    )
    .join("");

  const stats = ctx.stats
    .map((s) => `<div class="stat"><div class="stat-val">${s.value}</div><div class="stat-label">${s.label}</div></div>`)
    .join("");

  const sections = ctx.sections
    .map(
      (sec) => `
      <section>
        <h2>${sec.heading}</h2>
        <table>
          ${sec.rows.map((r) => `<tr><td class="k">${r.label}</td><td class="v">${r.value}</td></tr>`).join("")}
        </table>
      </section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${title} — ${ctx.subjectName}</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --brand:#4f46e5; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; color: var(--ink); margin: 0; padding: 48px; max-width: 860px; margin: 0 auto; }
  header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid var(--brand); padding-bottom:16px; }
  .brand { font-weight:800; font-size:20px; color:var(--brand); }
  h1 { font-size:26px; margin:24px 0 4px; }
  .sub { color:var(--muted); margin:0 0 24px; }
  .scores { display:grid; grid-template-columns:repeat(6,1fr); gap:8px; margin:24px 0; }
  .score { border:1px solid var(--line); border-radius:10px; padding:12px; text-align:center; }
  .score-val { font-size:26px; font-weight:800; }
  .score-label { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; margin-top:2px; }
  .score-band { font-size:11px; font-weight:700; margin-top:2px; }
  .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:16px 0 8px; }
  .stat { background:#f8fafc; border-radius:10px; padding:12px; }
  .stat-val { font-size:20px; font-weight:700; }
  .stat-label { font-size:12px; color:var(--muted); }
  section { margin-top:28px; }
  h2 { font-size:15px; text-transform:uppercase; letter-spacing:.04em; color:var(--brand); border-bottom:1px solid var(--line); padding-bottom:6px; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  td { padding:8px 0; border-bottom:1px solid var(--line); vertical-align:top; }
  td.k { color:var(--muted); width:38%; }
  td.v { font-weight:500; }
  footer { margin-top:40px; padding-top:16px; border-top:1px solid var(--line); color:var(--muted); font-size:12px; }
  @media print { body { padding: 0; } @page { margin: 18mm; } }
</style></head>
<body>
  <header>
    <div>
      <div class="brand">PrivacyOS</div>
      <h1>${title}</h1>
      <p class="sub">Prepared for <strong>${ctx.subjectName}</strong>${ctx.organization ? ` · ${ctx.organization}` : ""} · ${new Date(ctx.generatedAt).toLocaleString()}</p>
    </div>
    <div style="text-align:right;color:var(--muted);font-size:12px">Confidential<br/>Auto-generated</div>
  </header>

  <div class="scores">${scoreCards}</div>
  <div class="stats">${stats}</div>
  ${sections}

  <footer>
    This report was generated automatically by the PrivacyOS reporting engine. Scores are on a 0–100 risk scale (higher = greater risk). Confidential — for the named recipient only.
  </footer>
</body></html>`;
}
