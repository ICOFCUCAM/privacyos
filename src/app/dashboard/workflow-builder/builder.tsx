"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Bot, GitFork, Bell, FileText, Save, Power, PowerOff, Pencil,
  AlertTriangle, ArrowRight, Zap, Filter, FolderKanban, Webhook, Clock, Play,
  GripVertical, Sliders, MousePointerClick, CornerDownRight, Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { cn, titleCase } from "@/lib/ui";
import type { AgentKind, RiskLevel } from "@/lib/types";
import {
  addStep, describeTrigger, emptyWorkflow, reorderStep, newStepId,
  removeStep, validateWorkflow, simulateRun, executeWorkflow, describeStep,
  TRIGGER_CATALOG, TRIGGER_CATEGORIES, RISK_QUALIFIED_TRIGGERS, ACTION_CATALOG, actionToStep,
  APPROVAL_CATALOG, approvalToStep, APPROVER_LABEL,
  type ActionBlock, type ApproverRole,
  type StepType, type TriggerKind, type WorkflowDefinition, type WorkflowStepDef,
  type ConditionField, type ConditionOp, type SampleEvent, type StepOutcome,
  type WorkflowRun, type RunStatus,
} from "@/lib/agents/workflow-builder";
import { AGENT_LABEL } from "@/lib/billing/entitlements";
import { deleteWorkflowAction, saveWorkflowAction, toggleWorkflowAction } from "./actions";

const STEP_META: Record<StepType, { label: string; icon: LucideIcon }> = {
  agent: { label: "Agent", icon: Bot },
  condition: { label: "Condition", icon: Filter },
  decision: { label: "Approval", icon: GitFork },
  notify: { label: "Notify", icon: Bell },
  case: { label: "Open case", icon: FolderKanban },
  takedown: { label: "Takedown", icon: Trash2 },
  report: { label: "Report", icon: FileText },
  webhook: { label: "Webhook", icon: Webhook },
  wait: { label: "Wait", icon: Clock },
};

const OUTCOME_CLS: Record<StepOutcome, string> = {
  run: "text-risk-low ring-risk-low/30",
  paused: "text-risk-medium ring-risk-medium/30",
  waited: "text-risk-medium ring-risk-medium/30",
  skipped: "text-slate-500 ring-border",
  stopped: "text-risk-high ring-risk-high/30",
};

const RUN_STATUS_CLS: Record<RunStatus, string> = {
  success: "text-risk-low ring-risk-low/30",
  paused: "text-risk-medium ring-risk-medium/30",
  stopped: "text-risk-high ring-risk-high/30",
  failed: "text-risk-high ring-risk-high/30",
};

const RISKS: RiskLevel[] = ["low", "medium", "high", "critical"];
const OP_LABEL: Record<ConditionOp, string> = { gt: ">", gte: "≥", lt: "<", lte: "≤", eq: "=", contains: "contains", exists: "exists" };

/** Logic/utility blocks offered in the toolbox (non-agent, non-catalog types). */
const LOGIC_BLOCKS: { type: StepType; label: string }[] = [
  { type: "condition", label: "If / condition" },
  { type: "decision", label: "Approval" },
  { type: "wait", label: "Wait" },
  { type: "notify", label: "Send alert" },
  { type: "takedown", label: "Takedown" },
  { type: "webhook", label: "Webhook" },
];

function defaultStep(type: StepType): WorkflowStepDef {
  const id = newStepId();
  switch (type) {
    case "condition": return { id, type, label: "Risk check", condition: { field: "risk", op: "gte", value: "high" }, onFalse: "stop" };
    case "decision": return { id, type, label: "Approval required", requiresApproval: true, approver: "manager" };
    case "wait": return { id, type, label: "Wait", delayHours: 24 };
    case "notify": return { id, type, label: "Send alert" };
    case "takedown": return { id, type, label: "File takedown" };
    case "webhook": return { id, type, label: "Call webhook", url: "" };
    case "report": return { id, type, label: "Generate report" };
    case "case": return { id, type, label: "Open case" };
    default: return { id, type: "agent", label: AGENT_LABEL.discovery, agent: "discovery" };
  }
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60); const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

type Selection = "trigger" | string | null;

export function WorkflowBuilder({ initial, agents }: { initial: WorkflowDefinition[]; agents: AgentKind[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<WorkflowDefinition>(emptyWorkflow());
  const [selected, setSelected] = useState<Selection>("trigger");

  // Drag state: reorder existing blocks, or drag a toolbox block in to add it.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dragAgent, setDragAgent] = useState<AgentKind | null>(null);
  const [dragAction, setDragAction] = useState<ActionBlock | null>(null);
  const [dragApprover, setDragApprover] = useState<ApproverRole | null>(null);
  const [dragLogic, setDragLogic] = useState<StepType | null>(null);

  // Dry-run sample event + last execution run
  const [simRisk, setSimRisk] = useState<RiskLevel>("critical");
  const [simKind, setSimKind] = useState("doxxing");
  const [simScore, setSimScore] = useState(85);
  const [simSource, setSimSource] = useState("dark_web");
  const [lastRun, setLastRun] = useState<WorkflowRun | null>(null);

  const validation = validateWorkflow(draft);
  const isEditing = draft.id !== "draft";
  const sampleEvent: SampleEvent = { risk: simRisk, kind: simKind, score: simScore, source: simSource };
  const simulation = simulateRun(draft, sampleEvent);
  const selectedStep = typeof selected === "string" && selected !== "trigger"
    ? draft.steps.find((s) => s.id === selected) ?? null
    : null;

  /* ── mutations ─────────────────────────────────────────────────────────── */
  function patchTrigger(p: Partial<WorkflowDefinition["trigger"]>) {
    setDraft((d) => ({ ...d, trigger: { ...d.trigger, ...p } }));
  }
  function patchStep(id: string, patch: Partial<WorkflowStepDef>) {
    setDraft((d) => ({ ...d, steps: d.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }
  function patchCondition(id: string, patch: Partial<NonNullable<WorkflowStepDef["condition"]>>) {
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s) =>
        s.id === id ? { ...s, condition: { field: "risk", op: "gte", value: "high", ...s.condition, ...patch } } : s),
    }));
  }
  function pushStep(step: WorkflowStepDef) { setDraft((d) => addStep(d, step)); setSelected(step.id); }
  function addAgent(kind: AgentKind) { pushStep({ id: newStepId(), type: "agent", agent: kind, label: AGENT_LABEL[kind] }); }
  function addAction(a: ActionBlock) { const s = actionToStep(a); pushStep(s); }
  function addApproval(role: ApproverRole) { pushStep(approvalToStep(role)); }
  function addLogic(type: StepType) { pushStep(defaultStep(type)); }

  function dropNew(): boolean {
    if (dragAgent) { addAgent(dragAgent); return true; }
    if (dragAction) { addAction(dragAction); return true; }
    if (dragApprover) { addApproval(dragApprover); return true; }
    if (dragLogic) { addLogic(dragLogic); return true; }
    return false;
  }
  function clearDrag() { setDragIndex(null); setDragAgent(null); setDragAction(null); setDragApprover(null); setDragLogic(null); setOverIndex(null); }
  function onDropAt(to: number) {
    if (!dropNew() && dragIndex !== null && dragIndex !== to) setDraft((d) => reorderStep(d, dragIndex, to));
    clearDrag();
  }
  function deleteStep(id: string) {
    setDraft((d) => removeStep(d, id));
    if (selected === id) setSelected("trigger");
  }

  function resetDraft() { setDraft(emptyWorkflow()); setSelected("trigger"); setLastRun(null); }
  function loadForEdit(def: WorkflowDefinition) {
    setDraft(def); setSelected("trigger");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function onSave() {
    if (!validation.valid) return;
    const toSave = draft;
    start(async () => { await saveWorkflowAction(toSave); resetDraft(); router.refresh(); });
  }
  function onToggle(id: string, enabled: boolean) { start(async () => { await toggleWorkflowAction(id, enabled); router.refresh(); }); }
  function onDelete(id: string) { start(async () => { await deleteWorkflowAction(id); if (draft.id === id) resetDraft(); router.refresh(); }); }

  /* ── toolbox drag helpers ──────────────────────────────────────────────── */
  const beginDrag = {
    agent: (a: AgentKind) => { setDragAgent(a); setDragIndex(null); setDragAction(null); setDragApprover(null); setDragLogic(null); },
    action: (a: ActionBlock) => { setDragAction(a); setDragIndex(null); setDragAgent(null); setDragApprover(null); setDragLogic(null); },
    approver: (r: ApproverRole) => { setDragApprover(r); setDragIndex(null); setDragAgent(null); setDragAction(null); setDragLogic(null); },
    logic: (t: StepType) => { setDragLogic(t); setDragIndex(null); setDragAgent(null); setDragAction(null); setDragApprover(null); },
  };

  return (
    <div className="space-y-4">
      {/* Header bar: name + enable + save */}
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Workflow name — e.g. Executive Protection"
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-bg-subtle/60 px-3 py-2 text-sm font-semibold text-white placeholder:text-slate-600 placeholder:font-normal focus:border-brand/50 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))} className="accent-brand" />
          Enable on save
        </label>
        {isEditing && (
          <button onClick={resetDraft} className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-slate-300 hover:text-white">+ New</button>
        )}
        <button
          onClick={onSave}
          disabled={!validation.valid || pending}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition",
            validation.valid && !pending ? "bg-brand text-white hover:bg-brand/90" : "cursor-not-allowed bg-bg-subtle text-slate-600",
          )}
        >
          <Save className="h-4 w-4" /> {pending ? "Saving…" : isEditing ? "Update" : "Save"}
        </button>
      </Card>

      {/* ── Three-panel designer ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)_300px]">
        {/* LEFT — Toolbox */}
        <Card className="h-fit p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <Layers className="h-3.5 w-3.5 text-brand" /> Toolbox
          </p>

          <ToolGroup title="Triggers">
            {(Object.keys(TRIGGER_CATALOG) as TriggerKind[]).map((k) => (
              <button
                key={k}
                onClick={() => { patchTrigger({ kind: k }); setSelected("trigger"); }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] transition",
                  draft.trigger.kind === k ? "border-risk-medium/40 bg-risk-medium/10 text-white" : "border-border bg-bg-elevated/50 text-slate-400 hover:text-white",
                )}
              >
                <Zap className="h-3 w-3 shrink-0 text-risk-medium" /> <span className="truncate">{TRIGGER_CATALOG[k].label}</span>
              </button>
            ))}
          </ToolGroup>

          <ToolGroup title={`Agents · ${agents.length}`}>
            {agents.map((a) => (
              <ToolButton key={a} icon={Bot} label={AGENT_LABEL[a]} onClick={() => addAgent(a)} onDragStart={() => beginDrag.agent(a)} onDragEnd={clearDrag} />
            ))}
          </ToolGroup>

          <ToolGroup title={`Actions · ${ACTION_CATALOG.length}`}>
            {ACTION_CATALOG.map((a) => (
              <ToolButton key={a.id} icon={STEP_META[a.type].icon} label={a.label} onClick={() => addAction(a)} onDragStart={() => beginDrag.action(a)} onDragEnd={clearDrag} />
            ))}
          </ToolGroup>

          <ToolGroup title="Logic">
            {LOGIC_BLOCKS.map((b) => (
              <ToolButton key={b.type} icon={STEP_META[b.type].icon} label={b.label} onClick={() => addLogic(b.type)} onDragStart={() => beginDrag.logic(b.type)} onDragEnd={clearDrag} />
            ))}
          </ToolGroup>

          <ToolGroup title="Approvals" last>
            {APPROVAL_CATALOG.map((a) => (
              <ToolButton key={a.role} icon={GitFork} label={a.label} tone="amber" onClick={() => addApproval(a.role)} onDragStart={() => beginDrag.approver(a.role)} onDragEnd={clearDrag} />
            ))}
          </ToolGroup>
        </Card>

        {/* CENTER — Canvas */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <MousePointerClick className="h-3.5 w-3.5 text-brand" /> Canvas
            </p>
            <span className="text-[10px] text-slate-500">click a block to configure · drag to reorder</span>
          </div>

          <div
            className="flex flex-col items-stretch"
            onDragOver={(e) => { if (dragAgent || dragAction || dragApprover || dragLogic) e.preventDefault(); }}
            onDrop={() => { dropNew(); clearDrag(); }}
          >
            {/* Trigger node */}
            <button
              onClick={() => setSelected("trigger")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition",
                selected === "trigger" ? "border-risk-medium/50 bg-risk-medium/10 ring-1 ring-risk-medium/40" : "border-risk-medium/30 bg-risk-medium/5 hover:bg-risk-medium/10",
              )}
            >
              <Zap className="h-4 w-4 shrink-0 text-risk-medium" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Trigger</p>
                <p className="truncate text-sm font-semibold text-white">{describeTrigger(draft.trigger)}</p>
              </div>
            </button>

            {draft.steps.length === 0 ? (
              <>
                <Connector />
                <div className="rounded-lg border border-dashed border-border bg-bg-subtle/30 px-3 py-6 text-center text-xs text-slate-500">
                  Drag blocks from the toolbox, or click them to add. Build your flow top-to-bottom.
                </div>
              </>
            ) : (
              draft.steps.map((s, i) => {
                const M = STEP_META[s.type];
                const isSel = selected === s.id;
                const sim = simulation.steps[i];
                return (
                  <div key={s.id}>
                    <Connector />
                    <div
                      draggable
                      onClick={() => setSelected(s.id)}
                      onDragStart={() => setDragIndex(i)}
                      onDragOver={(e) => { e.preventDefault(); if (overIndex !== i) setOverIndex(i); }}
                      onDrop={() => onDropAt(i)}
                      onDragEnd={clearDrag}
                      className={cn(
                        "group flex cursor-pointer items-center gap-2.5 rounded-lg border bg-bg-subtle/40 px-3 py-2.5 transition",
                        dragIndex === i ? "opacity-50" : "",
                        isSel ? "border-brand/50 ring-1 ring-brand/40"
                          : overIndex === i && dragIndex !== null && dragIndex !== i ? "border-brand/50 ring-1 ring-brand/40" : "border-border hover:border-brand/30",
                      )}
                    >
                      <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-600 active:cursor-grabbing" />
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[10px] font-bold text-slate-400">{i + 1}</span>
                      <M.icon className="h-4 w-4 shrink-0 text-brand-fg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{s.label}</p>
                        <p className="text-[10px] text-slate-500">
                          {M.label}
                          {s.agent && ` · ${AGENT_LABEL[s.agent]}`}
                          {s.type === "decision" && s.approver && ` · ${APPROVER_LABEL[s.approver]}`}
                          {s.type === "wait" && s.delayHours ? ` · ${s.delayHours}h` : ""}
                        </p>
                      </div>
                      {sim && (
                        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ring-1", OUTCOME_CLS[sim.outcome])}>{sim.outcome}</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteStep(s.id); }}
                        aria-label="Remove block"
                        className="shrink-0 rounded p-1 text-slate-600 opacity-0 transition hover:bg-risk-high/15 hover:text-risk-high group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Condition → YES / NO branches */}
                    {s.type === "condition" && s.condition && (
                      <div className="ml-7 mt-1 space-y-1">
                        <BranchRow label="YES" tone="low" text="continue → next block" />
                        <BranchRow label="NO" tone={s.onFalse === "continue" ? "medium" : "high"} text={s.onFalse === "continue" ? "continue anyway" : "stop the run"} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* RIGHT — Configuration */}
        <Card className="h-fit p-3">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <Sliders className="h-3.5 w-3.5 text-brand" /> Configuration
          </p>

          {selected === "trigger" ? (
            <div className="space-y-3">
              <Field label="Trigger — when this runs">
                <select value={draft.trigger.kind} onChange={(e) => patchTrigger({ kind: e.target.value as TriggerKind })} className={inputCls}>
                  {TRIGGER_CATEGORIES.map((g) => (
                    <optgroup key={g.category} label={g.label}>
                      {(Object.keys(TRIGGER_CATALOG) as TriggerKind[]).filter((k) => TRIGGER_CATALOG[k].category === g.category)
                        .map((k) => <option key={k} value={k}>{TRIGGER_CATALOG[k].label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
              {RISK_QUALIFIED_TRIGGERS.includes(draft.trigger.kind) && (
                <Field label="Minimum risk to fire">
                  <select value={draft.trigger.minRisk ?? "high"} onChange={(e) => patchTrigger({ minRisk: e.target.value as RiskLevel })} className={inputCls}>
                    {RISKS.map((r) => <option key={r} value={r}>{titleCase(r)} and above</option>)}
                  </select>
                </Field>
              )}
              {draft.trigger.kind === "score_above" && (
                <Field label="Risk-score threshold (1–100)">
                  <input type="number" min={1} max={100} value={draft.trigger.threshold ?? 70} onChange={(e) => patchTrigger({ threshold: Number(e.target.value) })} className={inputCls} />
                </Field>
              )}
              {draft.trigger.kind === "scheduled" && (
                <Field label="Cadence">
                  <select value={draft.trigger.cadence ?? "daily"} onChange={(e) => patchTrigger({ cadence: e.target.value })} className={inputCls}>
                    {["every 1h", "every 6h", "daily", "weekly", "monthly"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              )}
              <p className="rounded-lg bg-bg-subtle/40 p-2 text-[11px] text-slate-500">Select any block on the canvas to configure it here.</p>
            </div>
          ) : selectedStep ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-bg-subtle/40 px-2.5 py-2">
                {(() => { const I = STEP_META[selectedStep.type].icon; return <I className="h-4 w-4 text-brand-fg" />; })()}
                <span className="text-xs font-semibold text-white">{STEP_META[selectedStep.type].label} block</span>
              </div>

              <Field label="Label">
                <input value={selectedStep.label} onChange={(e) => patchStep(selectedStep.id, { label: e.target.value })} className={inputCls} />
              </Field>

              {selectedStep.type === "agent" && (
                <Field label="Assigned agent">
                  <select value={selectedStep.agent ?? agents[0]} onChange={(e) => patchStep(selectedStep.id, { agent: e.target.value as AgentKind })} className={inputCls}>
                    {agents.map((a) => <option key={a} value={a}>{AGENT_LABEL[a]}</option>)}
                  </select>
                </Field>
              )}

              {selectedStep.type === "condition" && (
                <div className="space-y-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Condition</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <select value={selectedStep.condition?.field ?? "risk"} onChange={(e) => patchCondition(selectedStep.id, { field: e.target.value as ConditionField })} className={inputCls} aria-label="Field">
                      {(["risk", "score", "kind", "source"] as ConditionField[]).map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={selectedStep.condition?.op ?? "gte"} onChange={(e) => patchCondition(selectedStep.id, { op: e.target.value as ConditionOp })} className={inputCls} aria-label="Operator">
                      {(["gt", "gte", "lt", "lte", "eq", "contains", "exists"] as ConditionOp[]).map((o) => <option key={o} value={o}>{OP_LABEL[o]}</option>)}
                    </select>
                    {selectedStep.condition?.op !== "exists"
                      ? <input value={selectedStep.condition?.value ?? ""} onChange={(e) => patchCondition(selectedStep.id, { value: e.target.value })} className={inputCls} placeholder="value" aria-label="Value" />
                      : <span className="flex items-center px-1 text-[10px] text-slate-500">exists</span>}
                  </div>
                  <Field label="If not met">
                    <select value={selectedStep.onFalse ?? "stop"} onChange={(e) => patchStep(selectedStep.id, { onFalse: e.target.value as "stop" | "continue" })} className={inputCls}>
                      <option value="stop">stop the run</option>
                      <option value="continue">continue anyway</option>
                    </select>
                  </Field>
                </div>
              )}

              {selectedStep.type === "decision" && (
                <Field label="Approver">
                  <select value={selectedStep.approver ?? "manager"} onChange={(e) => patchStep(selectedStep.id, { approver: e.target.value as ApproverRole, requiresApproval: true })} className={inputCls}>
                    {APPROVAL_CATALOG.map((a) => <option key={a.role} value={a.role}>{APPROVER_LABEL[a.role]}</option>)}
                  </select>
                </Field>
              )}

              {selectedStep.type === "wait" && (
                <Field label="Delay (hours)">
                  <input type="number" min={1} value={selectedStep.delayHours ?? 24} onChange={(e) => patchStep(selectedStep.id, { delayHours: Number(e.target.value) })} className={inputCls} />
                </Field>
              )}

              {selectedStep.type === "webhook" && (
                <Field label="Webhook URL">
                  <input value={selectedStep.url ?? ""} onChange={(e) => patchStep(selectedStep.id, { url: e.target.value })} placeholder="https://hooks.example.com/…" className={inputCls} />
                </Field>
              )}

              <button onClick={() => deleteStep(selectedStep.id)} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-risk-high/10 px-3 py-2 text-xs font-semibold text-risk-high ring-1 ring-risk-high/25 hover:bg-risk-high/20">
                <Trash2 className="h-3.5 w-3.5" /> Remove block
              </button>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-bg-subtle/30 px-3 py-6 text-center text-xs text-slate-500">
              Select the trigger or a block on the canvas to configure it.
            </p>
          )}
        </Card>
      </div>

      {/* Validation */}
      {!validation.valid && (
        <Card className="p-3">
          <ul className="space-y-1">
            {validation.errors.map((e) => (
              <li key={e} className="flex items-center gap-1.5 text-[11px] text-risk-medium"><AlertTriangle className="h-3 w-3 shrink-0" /> {e}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Test run + execution record */}
      {draft.steps.length > 0 && (
        <Card className="p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Play className="h-3 w-3 text-brand" /> Test run · sample event</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Field label="risk">
                  <select value={simRisk} onChange={(e) => setSimRisk(e.target.value as RiskLevel)} className={inputCls}>{RISKS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
                </Field>
                <Field label="score"><input type="number" min={0} max={100} value={simScore} onChange={(e) => setSimScore(Number(e.target.value))} className={inputCls} /></Field>
                <Field label="kind"><input value={simKind} onChange={(e) => setSimKind(e.target.value)} className={inputCls} /></Field>
                <Field label="source"><input value={simSource} onChange={(e) => setSimSource(e.target.value)} className={inputCls} /></Field>
              </div>
            </div>
            <button onClick={() => setLastRun(executeWorkflow(draft, sampleEvent))} className="flex items-center gap-1.5 rounded-lg bg-brand/15 px-3 py-2 text-xs font-semibold text-brand ring-1 ring-brand/30 hover:bg-brand/25">
              <Play className="h-3.5 w-3.5" /> Run workflow
            </button>
          </div>

          <ol className="mt-3 space-y-1">
            {simulation.steps.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-[11px]">
                <span className="w-4 shrink-0 text-right text-slate-600">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-slate-300">{describeStep(r.step)}</span>
                <span className="shrink-0 truncate text-[10px] text-slate-500">{r.detail}</span>
                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1", OUTCOME_CLS[r.outcome])}>{r.outcome}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[10px] text-slate-500">{simulation.reached} of {draft.steps.length} block(s) would execute{simulation.stoppedAt != null ? ` · stops at block ${simulation.stoppedAt + 1}` : ""}.</p>

          {lastRun && (
            <div className="mt-4 rounded-xl border border-border bg-bg-subtle/30 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Play className="h-3 w-3 text-brand" /> Run {lastRun.id}</p>
                <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1", RUN_STATUS_CLS[lastRun.status])}>{lastRun.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <Stat label="Start time" value={fmtTime(lastRun.startedAt)} />
                <Stat label="End time" value={fmtTime(lastRun.endedAt)} />
                <Stat label="Duration" value={fmtDuration(lastRun.durationSec)} />
              </div>
              {lastRun.agentActivity.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-[9px] uppercase tracking-wide text-slate-500">Agent activity</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lastRun.agentActivity.map((a) => (
                      <span key={a.agent} className="flex items-center gap-1 rounded-full bg-bg-subtle/60 px-2 py-0.5 text-[10px] text-slate-300 ring-1 ring-border"><Bot className="h-3 w-3 text-brand" /> {AGENT_LABEL[a.agent]} · {a.actions}</span>
                    ))}
                  </div>
                </div>
              )}
              {lastRun.outputs.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-[9px] uppercase tracking-wide text-slate-500">Outputs</p>
                  <ul className="space-y-0.5">{lastRun.outputs.map((o, i) => <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-risk-low" /> {o}</li>)}</ul>
                </div>
              )}
              {lastRun.errors.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-[9px] uppercase tracking-wide text-risk-high">Errors</p>
                  <ul className="space-y-0.5">{lastRun.errors.map((e, i) => <li key={i} className="flex items-start gap-1.5 text-[11px] text-risk-high"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {e}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Saved workflows */}
      <Card className="p-4">
        <SectionTitle title="Saved workflows" subtitle={`${initial.length} definition${initial.length === 1 ? "" : "s"} — enabled workflows run automatically on matching events`} />
        {initial.length === 0 ? (
          <p className="text-sm text-slate-500">No saved workflows yet. Compose one above and save it — enabled definitions trigger on matching detections.</p>
        ) : (
          <ul className="space-y-2">
            {initial.map((w) => (
              <li key={w.id} className="rounded-xl border border-border bg-bg-subtle/40 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{w.name}</span>
                    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1", w.enabled ? "bg-risk-low/12 text-risk-low ring-risk-low/30" : "bg-bg-subtle text-slate-500 ring-border")}>
                      {w.enabled ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />} {w.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onToggle(w.id, !w.enabled)} disabled={pending} className="rounded-md bg-bg-elevated px-2 py-1 text-[11px] font-medium text-slate-300 ring-1 ring-border hover:text-white disabled:opacity-50">{w.enabled ? "Disable" : "Enable"}</button>
                    <button onClick={() => loadForEdit(w)} disabled={pending} className="inline-flex items-center gap-1 rounded-md bg-bg-elevated px-2 py-1 text-[11px] font-medium text-slate-300 ring-1 ring-border hover:text-white disabled:opacity-50"><Pencil className="h-3 w-3" /> Edit</button>
                    <button onClick={() => onDelete(w.id)} disabled={pending} className="inline-flex items-center gap-1 rounded-md bg-risk-high/10 px-2 py-1 text-[11px] font-medium text-risk-high ring-1 ring-risk-high/25 hover:bg-risk-high/20 disabled:opacity-50"><Trash2 className="h-3 w-3" /> Delete</button>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">Trigger: <span className="text-slate-400">{describeTrigger(w.trigger)}</span>{" · "}{w.steps.length} step{w.steps.length === 1 ? "" : "s"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {w.steps.map((s, i) => (
                    <span key={s.id} className="inline-flex items-center gap-1">
                      <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-border">{s.agent ? titleCase(s.agent) : STEP_META[s.type].label}</span>
                      {i < w.steps.length - 1 && <ArrowRight className="h-3 w-3 text-slate-600" />}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ── small components ──────────────────────────────────────────────────────── */

const inputCls =
  "w-full rounded-lg border border-border bg-bg-subtle/60 px-2.5 py-2 text-sm text-white placeholder:text-slate-600 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function ToolGroup({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={cn("space-y-1", last ? "" : "mb-3 border-b border-border/60 pb-3")}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ToolButton({
  icon: Icon, label, onClick, onDragStart, onDragEnd, tone,
}: {
  icon: LucideIcon; label: string; onClick: () => void; onDragStart: () => void; onDragEnd: () => void; tone?: "amber";
}) {
  return (
    <button
      type="button"
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title="Click or drag onto the canvas"
      className={cn(
        "flex w-full cursor-grab items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] transition active:cursor-grabbing",
        tone === "amber"
          ? "border-risk-medium/30 bg-risk-medium/5 text-slate-300 hover:border-risk-medium/50 hover:text-white"
          : "border-border bg-bg-elevated/50 text-slate-300 hover:border-brand/40 hover:text-white",
      )}
    >
      <Icon className={cn("h-3 w-3 shrink-0", tone === "amber" ? "text-risk-medium" : "text-brand-fg")} />
      <span className="min-w-0 truncate font-medium">{label}</span>
    </button>
  );
}

function Connector() {
  return <div className="flex justify-center py-1 text-slate-600"><svg width="12" height="16" viewBox="0 0 12 16" fill="none"><path d="M6 0v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>;
}

function BranchRow({ label, text, tone }: { label: string; text: string; tone: "low" | "medium" | "high" }) {
  const cls = tone === "low" ? "text-risk-low ring-risk-low/30" : tone === "medium" ? "text-risk-medium ring-risk-medium/30" : "text-risk-high ring-risk-high/30";
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-400">
      <CornerDownRight className="h-3 w-3 text-slate-600" />
      <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1", cls)}>{label}</span>
      <span>{text}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bg-subtle/50 p-2">
      <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-mono text-slate-200">{value}</p>
    </div>
  );
}
