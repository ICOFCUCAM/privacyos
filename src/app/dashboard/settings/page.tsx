import { Settings } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { SubjectSettingsForm } from "@/components/subject-settings-form";
import { getDataSource } from "@/lib/data";

export default async function SettingsPage() {
  const ds = await getDataSource();
  const subject = await ds.getPrimarySubject();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-brand" />
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage who and what PrivacyOS monitors. Changes take effect on the next scan.
          </p>
        </div>
      </div>

      <Card>
        <SectionTitle title="Monitored subject" subtitle="Identifiers the agent fleet tracks" />
        {subject ? (
          <SubjectSettingsForm subject={subject} live={ds.live} />
        ) : (
          <p className="text-sm text-slate-400">No subject yet — complete onboarding first.</p>
        )}
      </Card>
    </div>
  );
}
