import Link from "next/link";
import { Settings, CreditCard } from "lucide-react";
import { buttonClasses, Card, PageHeader, Pill, SectionTitle } from "@/components/ui";
import { SubjectSettingsForm } from "@/components/subject-settings-form";
import { getDataSource } from "@/lib/data";
import { getSubscription } from "@/lib/billing/subscription";
import { PLANS } from "@/lib/billing/plans";
import { titleCase } from "@/lib/ui";
import { openBillingPortal } from "./billing-actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ds = await getDataSource();
  const subject = await ds.getPrimarySubject();
  const sub = await getSubscription();
  const plan = sub ? PLANS.find((p) => p.id === sub.planId) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        icon={Settings}
        title="Settings"
        subtitle="Manage who and what PrivacyOS monitors. Changes take effect on the next scan."
      />

      <Card>
        <SectionTitle title="Monitored subject" subtitle="Identifiers the agent fleet tracks" />
        {subject ? (
          <SubjectSettingsForm subject={subject} live={ds.live} />
        ) : (
          <p className="text-sm text-slate-400">No subject yet — complete onboarding first.</p>
        )}
      </Card>

      <Card>
        <SectionTitle title="Billing & plan" subtitle="Your subscription and invoices" />
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15">
            <CreditCard className="h-4 w-4 text-brand" />
          </span>
          <div className="flex-1">
            {plan ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white">{plan.name}</p>
                  <Pill>{titleCase(sub!.status)}</Pill>
                  {sub!.cancelAtPeriodEnd && <Pill>Cancels at period end</Pill>}
                </div>
                {sub!.currentPeriodEnd && (
                  <p className="text-xs text-slate-500">
                    Renews {new Date(sub!.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400">
                {ds.live ? "No active subscription." : "Demo mode — full access, no subscription."}
              </p>
            )}
          </div>
          {plan ? (
            <form action={openBillingPortal}>
              <button type="submit" className={buttonClasses("secondary", "md")}>
                Manage billing
              </button>
            </form>
          ) : (
            <Link href="/pricing" className={buttonClasses("primary", "md")}>
              View plans
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
