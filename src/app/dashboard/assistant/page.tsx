import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { ProtectPanel } from "@/components/protect-panel";

export const metadata = { title: "AI Assistant" };

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        icon={Sparkles}
        title="AI Privacy Assistant"
        subtitle="Your autonomous protection agent. Trigger a full protection cycle and review the prioritized action plan it produces."
      />
      <ProtectPanel />
    </div>
  );
}
