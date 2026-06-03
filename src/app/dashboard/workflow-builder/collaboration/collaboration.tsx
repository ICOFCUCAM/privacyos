"use client";

import { useState } from "react";
import {
  Zap, Bot, FolderKanban, ArrowDown, ArrowRight, Workflow, CheckCircle2, Layers,
} from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/ui";
import {
  COLLABORATIONS, runCollaboration, type AgentCollaboration, type CollabNode,
} from "@/lib/agents/agent-collaboration";
import { useCollaborationAction } from "./actions";

export function CollaborationExplorer() {
  const [activeId, setActiveId] = useState(COLLABORATIONS[0].id);
  const active = COLLABORATIONS.find((c) => c.id === activeId)!;

  return (
    <div className="space-y-4">
      {/* Scenario tabs */}
      <div className="flex flex-wrap gap-2">
        {COLLABORATIONS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition",
              c.id === activeId
                ? "bg-brand text-white ring-brand"
                : "bg-bg-subtle/60 text-slate-400 ring-border hover:text-white",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <CollaborationView c={active} />
    </div>
  );
}

function CollaborationView({ c }: { c: AgentCollaboration }) {
  const run = runCollaboration(c);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold text-white">{c.name}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{c.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
            run.coherent ? "text-risk-low ring-risk-low/30 bg-risk-low/10" : "text-risk-high ring-risk-high/30",
          )}>
            <CheckCircle2 className="h-3 w-3" /> {run.coherent ? "Context flows" : "Broken handoff"}
          </span>
          <form action={useCollaborationAction}>
            <input type="hidden" name="collaborationId" value={c.id} />
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90">
              <Workflow className="h-3.5 w-3.5" /> Use collaboration
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Handoff graph */}
        <div className="rounded-xl border border-border bg-bg-subtle/30 p-3">
          <div className="flex flex-col items-stretch">
            {c.nodes.map((n, i) => (
              <div key={i}>
                <CollabNodeRow node={n} />
                {i < c.nodes.length - 1 && (
                  <div className="flex justify-center py-1 text-slate-600"><ArrowDown className="h-4 w-4" /></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Shared context build-up */}
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <Layers className="h-3.5 w-3.5 text-brand" /> Shared context
          </p>
          <p className="mb-2 text-[11px] text-slate-500">Each agent contributes an artifact the next agents build on.</p>
          <ol className="space-y-1.5">
            {run.handoffs.map((h) => (
              <li key={h.order} className="rounded-lg border border-border bg-bg-subtle/40 p-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                  <Bot className="h-3 w-3 text-brand" /> {h.agentLabel}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">{h.role}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                  {h.consumes.map((a) => (
                    <span key={a} className="rounded bg-bg-elevated px-1.5 py-0.5 text-slate-400 ring-1 ring-border">↓ {a}</span>
                  ))}
                  <span className="rounded bg-brand/12 px-1.5 py-0.5 font-medium text-brand-fg ring-1 ring-brand/20">+ {h.produces}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Card>
  );
}

function CollabNodeRow({ node }: { node: CollabNode }) {
  if (node.kind === "trigger") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-risk-medium/30 bg-risk-medium/10 px-3 py-2">
        <Zap className="h-4 w-4 text-risk-medium" />
        <span className="text-xs font-semibold text-white">{node.label}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-500">Trigger</span>
      </div>
    );
  }
  if (node.kind === "case") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 py-2">
        <FolderKanban className="h-4 w-4 text-brand-fg" />
        <span className="text-xs font-semibold text-white">{node.label}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-500">Milestone</span>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-brand/25 bg-brand/[0.06] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand/15 text-brand"><Bot className="h-3.5 w-3.5" /></span>
        <span className="text-xs font-semibold text-white">{AGENT_DISPLAY[node.agent] ?? node.agent}</span>
      </div>
      <p className="mt-1 flex items-center gap-1 pl-8 text-[11px] text-slate-400">
        {node.role}
        <ArrowRight className="h-3 w-3 text-slate-600" />
        <span className="font-medium text-brand-fg">{node.produces}</span>
      </p>
    </div>
  );
}

// Light display map so the node chip reads like the spec (no " Agent" suffix duplication).
const AGENT_DISPLAY: Record<string, string> = {
  deepfake: "Deepfake Agent",
  threat_intel: "Threat Intelligence Agent",
  reputation: "Reputation Agent",
  legal: "Legal Agent",
  incident: "Incident Response Agent",
  executive: "Executive Protection Agent",
  security: "Security Agent",
  compliance: "Compliance Agent",
  discovery: "Discovery Agent",
  privacy: "Privacy Agent",
};
