import Link from "next/link";
import {
  Store, ArrowLeft, Download, Star, ShieldCheck, Users, AlertTriangle, ThumbsUp, Lock, Bot, ArrowDownRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { cn, titleCase } from "@/lib/ui";
import {
  MARKETPLACE_LISTINGS, featuredListings, listingSummary, marketplaceStats,
  type MarketplaceCategory, type MarketplaceListing,
} from "@/lib/agents/workflow-marketplace";
import { installListingAction } from "./actions";

export const metadata = { title: "Workflow Marketplace" };

const CATEGORY_ICON: Record<MarketplaceCategory, LucideIcon> = {
  Executive: ShieldCheck,
  Family: Users,
  Security: AlertTriangle,
  Reputation: ThumbsUp,
  Privacy: Lock,
};

export default function WorkflowMarketplacePage() {
  const featured = featuredListings();
  const more = MARKETPLACE_LISTINGS.filter((l) => !l.featured);
  const stats = marketplaceStats();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Store}
        title="Workflow Marketplace"
        subtitle="Install a complete protection workflow in one click. Each pack drops a fully-composed automation into your builder — ready to review and enable."
        actions={
          <Link
            href="/dashboard/workflow-builder"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to builder
          </Link>
        }
      />

      {/* Storefront stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Workflows" value={String(stats.listings)} tone="text-white" />
        <Kpi label="Featured" value={String(stats.featured)} tone="text-brand-fg" />
        <Kpi label="Installs" value={stats.totalInstalls.toLocaleString()} tone="text-white" />
        <Kpi label="Avg. rating" value={`${stats.avgRating}★`} tone="text-risk-low" />
      </div>

      {/* Featured */}
      <Card className="p-4">
        <SectionTitle title="Featured" subtitle="The most-installed protection packs" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((l) => <ListingCard key={l.id} l={l} featured />)}
        </div>
      </Card>

      {/* More */}
      {more.length > 0 && (
        <Card className="p-4">
          <SectionTitle title="More workflows" subtitle="Targeted packs for specific risks" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        </Card>
      )}

      <p className="px-1 text-center text-xs text-slate-600">
        {MARKETPLACE_LISTINGS.length} workflows · one-click install drops editable definitions into your builder, running on the same orchestrator the fleet uses.
      </p>
    </div>
  );
}

function ListingCard({ l, featured }: { l: MarketplaceListing; featured?: boolean }) {
  const s = listingSummary(l);
  const Icon = CATEGORY_ICON[l.category];
  return (
    <div className="flex flex-col rounded-xl border border-border bg-bg-subtle/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
          <Icon className="h-4 w-4" />
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-risk-low">
          <Star className="h-3 w-3 fill-current" /> {l.rating.toFixed(1)}
        </span>
      </div>

      <h3 className="mt-2.5 text-sm font-semibold text-white">{l.name}</h3>
      <p className="mt-0.5 text-[11px] font-medium text-brand-fg">{l.tagline}</p>
      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-400">{l.description}</p>

      {/* What's inside */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span>{s.workflows} workflow{s.workflows === 1 ? "" : "s"} · {s.steps} steps</span>
        <span className="inline-flex items-center gap-1"><Bot className="h-3 w-3" /> {s.agents.length} agents</span>
        {s.riskReduction > 0 && (
          <span className="inline-flex items-center gap-0.5 text-risk-low">
            <ArrowDownRight className="h-3 w-3" /> −{s.riskReduction} risk
          </span>
        )}
      </div>

      {/* Agent chips */}
      {s.agents.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {s.agents.slice(0, 5).map((a) => (
            <span key={a} className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-border">
              {titleCase(a)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <span className="text-[11px] text-slate-500">{l.installs.toLocaleString()} installs</span>
        <form action={installListingAction}>
          <input type="hidden" name="listingId" value={l.id} />
          <button
            type="submit"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              featured ? "bg-brand text-white hover:bg-brand/90" : "border border-brand/40 bg-brand/10 text-brand-fg hover:bg-brand/20",
            )}
          >
            <Download className="h-3.5 w-3.5" /> Install
          </button>
        </form>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-4">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <p className={cn("mt-1 text-2xl font-bold", tone)}>{value}</p>
    </Card>
  );
}
