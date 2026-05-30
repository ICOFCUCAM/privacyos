import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";

/**
 * Full-page gate shown when the current plan doesn't include a suite. Renders a
 * locked state with an upsell CTA to the relevant pricing category.
 */
export function UpgradeGate({
  suite,
  description,
  upsell,
}: {
  suite: string;
  description: string;
  upsell: string;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-border bg-bg-elevated/60 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/15">
        <Lock className="h-6 w-6 text-brand-fg" />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-white">{suite} is not on your plan</h1>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      <Link
        href={`/pricing#${upsell}`}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90"
      >
        View {suite} plans <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
