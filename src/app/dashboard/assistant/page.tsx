import { ProtectPanel } from "@/components/protect-panel";

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Privacy Assistant</h1>
        <p className="mt-1 text-sm text-slate-400">
          Your autonomous protection agent. Trigger a full protection cycle and review the prioritized action plan it produces.
        </p>
      </div>
      <ProtectPanel />
    </div>
  );
}
