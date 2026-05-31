/**
 * SaaS business-intelligence engine.
 *
 * Pure, deterministic computations of the metrics that define an enterprise SaaS
 * business: MRR/ARR, ARPU, expansion/contraction, net & gross revenue retention,
 * logo churn, CAC, LTV, the LTV:CAC ratio, the SaaS "magic number", payback
 * period, and an enterprise-contract book. Everything is derived from a book of
 * customer accounts + the plan catalog, so the numbers are explainable and
 * unit-tested rather than hand-typed marketing figures.
 *
 * The account book is provided by `lib/business/book` (demo synth today, a
 * Supabase-backed reader later) — this module never performs IO.
 */

import type { Plan, PlanCategory } from "@/lib/billing/plans";

export type AccountStatus = "active" | "trialing" | "churned";

/** A single customer account / subscription in the book of business. */
export interface Account {
  id: string;
  planId: string;
  category: PlanCategory;
  /** Seats / employees covered (drives per-seat expansion). */
  seats: number;
  status: AccountStatus;
  /** Effective monthly revenue for this account, USD. */
  mrr: number;
  /** ISO date the account first started paying. */
  startedAt: string;
  /** ISO date the account churned, when status === "churned". */
  churnedAt?: string;
  /** Blended acquisition cost for this logo, USD. */
  acquisitionCost: number;
  /** Annual contract (enterprise) vs monthly self-serve. */
  contractType: "monthly" | "annual";
  /** Net-new MRR added since acquisition via seats/upgrades (expansion). */
  expansionMrr: number;
}

const round = (n: number) => Math.round(n * 100) / 100;
const pct = (n: number) => Math.round(n * 1000) / 10; // one decimal place, as a percent

/* ── Core revenue ────────────────────────────────────────────────────────── */

export function activeAccounts(book: Account[]): Account[] {
  return book.filter((a) => a.status === "active");
}

/** Monthly recurring revenue from all active accounts. */
export function mrr(book: Account[]): number {
  return round(activeAccounts(book).reduce((s, a) => s + a.mrr, 0));
}

/** Annual recurring revenue. */
export function arr(book: Account[]): number {
  return round(mrr(book) * 12);
}

/** Average revenue per active account. */
export function arpu(book: Account[]): number {
  const active = activeAccounts(book);
  return active.length === 0 ? 0 : round(mrr(book) / active.length);
}

/** Active paying logos. */
export function activeLogos(book: Account[]): number {
  return activeAccounts(book).length;
}

/* ── Retention ───────────────────────────────────────────────────────────── */

export interface RetentionMetrics {
  /** Net revenue retention — includes expansion. >100% = healthy SaaS. */
  nrr: number;
  /** Gross revenue retention — excludes expansion, only losses. */
  grr: number;
  /** Logo (count) retention. */
  logoRetention: number;
  /** Monthly logo churn rate. */
  logoChurn: number;
  /** Total expansion MRR across active accounts. */
  expansionMrr: number;
  /** MRR lost to churn in the window. */
  churnedMrr: number;
}

/**
 * Cohort retention. `churnedMrr` is the MRR carried by churned accounts; the
 * base is the starting MRR (active base minus its own expansion, plus what
 * churned). NRR = (base + expansion − churn) / base. GRR caps expansion at 0.
 */
export function retention(book: Account[]): RetentionMetrics {
  const active = activeAccounts(book);
  const churned = book.filter((a) => a.status === "churned");
  const expansion = round(active.reduce((s, a) => s + a.expansionMrr, 0));
  const churnedMrr = round(churned.reduce((s, a) => s + a.mrr, 0));
  // Starting base = current active MRR minus expansion gained, plus MRR that has
  // since churned — i.e. the book as it stood at the start of the window.
  const activeBaseStart = round(active.reduce((s, a) => s + (a.mrr - a.expansionMrr), 0));
  const base = activeBaseStart + churnedMrr;
  const nrr = base === 0 ? 0 : pct((activeBaseStart + expansion) / base);
  const grr = base === 0 ? 0 : pct((base - churnedMrr) / base);
  const startingLogos = active.length + churned.length;
  const logoRetention = startingLogos === 0 ? 0 : pct(active.length / startingLogos);
  const logoChurn = startingLogos === 0 ? 0 : pct(churned.length / startingLogos);
  return { nrr, grr, logoRetention, logoChurn, expansionMrr: expansion, churnedMrr };
}

/* ── Unit economics ──────────────────────────────────────────────────────── */

export interface UnitEconomics {
  /** Blended customer acquisition cost. */
  cac: number;
  /** Lifetime value per customer. */
  ltv: number;
  /** LTV : CAC ratio (e.g. 3.0 = healthy). */
  ltvToCac: number;
  /** Months to recover CAC from gross margin. */
  paybackMonths: number;
  /** Gross margin assumption used, 0–1. */
  grossMargin: number;
}

const GROSS_MARGIN = 0.82; // typical software gross margin

/**
 * Unit economics. LTV = (ARPU × gross margin) / monthly churn. CAC is the
 * average acquisition cost across all logos ever acquired (active + churned).
 */
export function unitEconomics(book: Account[]): UnitEconomics {
  const everAcquired = book.length;
  const cac = everAcquired === 0 ? 0 : round(book.reduce((s, a) => s + a.acquisitionCost, 0) / everAcquired);
  const { logoChurn } = retention(book);
  const monthlyChurn = logoChurn / 100 || 0.02; // floor to avoid div-by-zero / infinite LTV
  const ltv = round((arpu(book) * GROSS_MARGIN) / monthlyChurn);
  const ltvToCac = cac === 0 ? 0 : round(ltv / cac);
  const paybackMonths = arpu(book) === 0 ? 0 : round(cac / (arpu(book) * GROSS_MARGIN));
  return { cac, ltv, ltvToCac, paybackMonths, grossMargin: GROSS_MARGIN };
}

/**
 * SaaS magic number = net new ARR in a period / prior-period S&M spend. Here we
 * approximate S&M as the acquisition cost of logos won this period.
 */
export function magicNumber(netNewArr: number, salesAndMarketing: number): number {
  return salesAndMarketing === 0 ? 0 : round(netNewArr / salesAndMarketing);
}

/* ── Revenue mix & enterprise book ───────────────────────────────────────── */

export interface CategoryRevenue {
  category: PlanCategory;
  label: string;
  mrr: number;
  logos: number;
  /** Share of total MRR, 0–100. */
  share: number;
}

export function revenueByCategory(
  book: Account[],
  categoryLabel: Record<PlanCategory, string>,
): CategoryRevenue[] {
  const active = activeAccounts(book);
  const totalMrr = mrr(book) || 1;
  const groups = new Map<PlanCategory, { mrr: number; logos: number }>();
  for (const a of active) {
    const cur = groups.get(a.category) ?? { mrr: 0, logos: 0 };
    cur.mrr += a.mrr;
    cur.logos += 1;
    groups.set(a.category, cur);
  }
  return [...groups.entries()]
    .map(([category, g]) => ({
      category,
      label: categoryLabel[category],
      mrr: round(g.mrr),
      logos: g.logos,
      share: Math.round((g.mrr / totalMrr) * 100),
    }))
    .sort((a, b) => b.mrr - a.mrr);
}

export interface EnterpriseBook {
  contracts: number;
  /** Total annual contract value across enterprise (annual) accounts. */
  acv: number;
  /** Average contract value. */
  averageAcv: number;
  /** Share of total MRR from enterprise contracts, 0–100. */
  mrrShare: number;
}

/** Enterprise = annual contracts (typically Executive/Business tiers). */
export function enterpriseBook(book: Account[]): EnterpriseBook {
  const enterprise = activeAccounts(book).filter((a) => a.contractType === "annual");
  const totalAcv = round(enterprise.reduce((s, a) => s + a.mrr * 12, 0));
  const totalMrr = mrr(book) || 1;
  const entMrr = enterprise.reduce((s, a) => s + a.mrr, 0);
  return {
    contracts: enterprise.length,
    acv: totalAcv,
    averageAcv: enterprise.length === 0 ? 0 : round(totalAcv / enterprise.length),
    mrrShare: Math.round((entMrr / totalMrr) * 100),
  };
}

/* ── MRR movement (growth waterfall) ─────────────────────────────────────── */

export interface MrrMovement {
  newMrr: number;
  expansionMrr: number;
  churnedMrr: number;
  netNewMrr: number;
}

/**
 * Approximate the monthly MRR waterfall. New = active accounts started within
 * the last 30 days; expansion = summed expansion on older accounts; churn = MRR
 * of accounts churned in the window.
 */
export function mrrMovement(book: Account[], now = Date.now()): MrrMovement {
  const WINDOW = 30 * 86_400_000;
  const isRecent = (iso?: string) => !!iso && now - new Date(iso).getTime() <= WINDOW;
  const active = activeAccounts(book);
  const newMrr = round(active.filter((a) => isRecent(a.startedAt)).reduce((s, a) => s + (a.mrr - a.expansionMrr), 0));
  const expansionMrr = round(
    active.filter((a) => !isRecent(a.startedAt)).reduce((s, a) => s + a.expansionMrr, 0),
  );
  const churnedMrr = round(
    book.filter((a) => a.status === "churned" && isRecent(a.churnedAt)).reduce((s, a) => s + a.mrr, 0),
  );
  return { newMrr, expansionMrr, churnedMrr, netNewMrr: round(newMrr + expansionMrr - churnedMrr) };
}

/* ── Plan-derived helpers ────────────────────────────────────────────────── */

/** Resolve a plan's effective monthly price (custom plans → a sensible floor). */
export function planMonthly(plan: Plan, fallback = 25000): number {
  return plan.monthly ?? fallback;
}
