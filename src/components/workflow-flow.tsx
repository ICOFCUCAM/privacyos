/**
 * Workflow flow-graph — a vertical "flow designer" canvas for a WorkflowDefinition.
 *
 * Renders the trigger, each block as a connected node (coloured by category),
 * a condition's true/false branches, and a terminal. When a dry-run simulation
 * is supplied, each node is tinted by its outcome (run / paused / waited /
 * skipped / stopped) so the canvas doubles as a live test visualization.
 * Pure & presentational (no hooks) — usable from server or client components.
 */

import { Zap, Bot, Filter, GitFork, Bell, FolderKanban, Trash2, FileText, Webhook, Clock, CheckCircle2, CornerDownRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  describeTrigger, describeStep, STEP_CATALOG,
  type WorkflowDefinition, type StepType, type BlockCategory, type SimulatedStep, type StepOutcome,
} from "@/lib/agents/workflow-builder";
import { cn } from "@/lib/ui";

const STEP_ICON: Record<StepType, LucideIcon> = {
  agent: Bot, condition: Filter, decision: GitFork, notify: Bell,
  case: FolderKanban, takedown: Trash2, report: FileText, webhook: Webhook, wait: Clock,
};

const CATEGORY_CLS: Record<BlockCategory, string> = {
  action: "border-brand/30 bg-brand/5",
  logic: "border-risk-medium/30 bg-risk-medium/5",
  human: "border-risk-high/30 bg-risk-high/5",
  integration: "border-slate-500/30 bg-slate-500/5",
};

const OUTCOME_RING: Record<StepOutcome, string> = {
  run: "ring-2 ring-risk-low/50",
  paused: "ring-2 ring-risk-medium/50",
  waited: "ring-2 ring-risk-medium/50",
  skipped: "opacity-40",
  stopped: "ring-2 ring-risk-high/60",
};

const OUTCOME_LABEL: Record<StepOutcome, string> = {
  run: "ran", paused: "paused", waited: "waited", skipped: "skipped", stopped: "stopped",
};

function Connector() {
  return <div className="h-4 w-px bg-border" aria-hidden />;
}

export function WorkflowFlow({ def, simulation }: { def: WorkflowDefinition; simulation?: SimulatedStep[] }) {
  return (
    <div className="flex flex-col items-center">
      {/* Trigger */}
      <div className="flex w-full max-w-xs items-center gap-2 rounded-xl border border-brand/40 bg-brand/15 px-3 py-2 text-center">
        <Zap className="h-4 w-4 shrink-0 text-brand-fg" />
        <span className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-white">{describeTrigger(def.trigger)}</span>
        <span className="shrink-0 text-[9px] uppercase tracking-wide text-brand-fg">trigger</span>
      </div>

      {def.steps.length === 0 && (
        <>
          <Connector />
          <p className="rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-slate-500">Add blocks to build the flow</p>
        </>
      )}

      {def.steps.map((s, i) => {
        const Icon = STEP_ICON[s.type];
        const cat = STEP_CATALOG[s.type].category;
        const outcome = simulation?.[i]?.outcome;
        return (
          <div key={s.id} className="flex w-full max-w-xs flex-col items-center">
            <Connector />
            <div className={cn("w-full rounded-xl border px-3 py-2", CATEGORY_CLS[cat], outcome && OUTCOME_RING[outcome])}>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[9px] font-bold text-slate-400">{i + 1}</span>
                <Icon className="h-3.5 w-3.5 shrink-0 text-brand-fg" />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-white">{describeStep(s)}</span>
                {outcome && <span className="shrink-0 text-[9px] uppercase tracking-wide text-slate-400">{OUTCOME_LABEL[outcome]}</span>}
              </div>
              {s.type === "condition" && (
                <div className="mt-1.5 flex items-center gap-3 border-t border-border/60 pt-1.5 text-[9px] text-slate-500">
                  <span className="flex items-center gap-1 text-risk-low"><CornerDownRight className="h-3 w-3" /> met → continue</span>
                  <span className={cn("flex items-center gap-1", s.onFalse === "continue" ? "text-slate-400" : "text-risk-high")}>
                    not met → {s.onFalse === "continue" ? "continue" : "stop"}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {def.steps.length > 0 && (
        <>
          <Connector />
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-bg-subtle/50 px-3 py-1 text-[10px] text-slate-400">
            <CheckCircle2 className="h-3 w-3 text-risk-low" /> Done
          </div>
        </>
      )}
    </div>
  );
}
