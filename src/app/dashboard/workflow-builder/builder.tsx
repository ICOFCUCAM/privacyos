"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ArrowUp, ArrowDown, Bot, GitFork, Bell, FileText,
  Save, Power, PowerOff, Pencil, AlertTriangle, ArrowRight, Zap,
  Filter, FolderKanban, Webhook, Clock, Play,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { cn, titleCase } from "@/lib/ui";
import type { AgentKind, RiskLevel } from "@/lib/types";
import {
  addStep, describeTrigger, emptyWorkflow, flowPreview, moveStep, newStepId,
  removeStep, validateWorkflow, simulateRun, describeStep,
  type StepType, type TriggerKind, type WorkflowDefinition, type WorkflowStepDef,
  type ConditionField, type ConditionOp, type SampleEvent, type StepOutcome,
} from "@/lib/agents/workflow-builder";
import { deleteWorkflowAction, saveWorkflowAction, toggleWorkflowAction } from "./actions";

const STEP_META: Record<StepType, { label: string; icon: LucideIcon; hint: string }> = {
  agent: { label: "Agent action", icon: Bot, hint: "An agent executes a task" },
  condition: { label: "Condition", icon: Filter, hint: "Continue only if a predicate holds" },
  decision: { label: "Human approval", icon: GitFork, hint: "Hold for human approval" },
  notify: { label: "Notify", icon: Bell, hint: "Alert the user or team" },
  case: { label: "Open case", icon: FolderKanban, hint: "Open a tracked case" },
  takedown: { label: "File takedown", icon: Trash2, hint: "Route a takedown / opt-out" },
  report: { label: "Report", icon: FileText, hint: "Generate a record" },
  webhook: { label: "Webhook", icon: Webhook, hint: "Call an external system" },
  wait: { label: "Wait", icon: Clock, hint: "Pause for a delay" },
};

const TRIGGERS: { kind: TriggerKind; label: string }[] = [
  { kind: "threat_detected", label: "Threat detected" },
  { kind: "exposure_found", label: "Exposure found" },
  { kind: "score_above", label: "Risk score above…" },
  { kind: "case_opened", label: "Case opened" },
  { kind: "incident_raised", label: "Incident raised" },
  { kind: "scheduled", label: "On a schedule" },
  { kind: "manual", label: "Manual / on-demand" },
];

const OUTCOME_CLS: Record<StepOutcome, string> = {
  run: "text-risk-low ring-risk-low/30",
  paused: "text-risk-medium ring-risk-medium/30",
  waited: "text-risk-medium ring-risk-medium/30",
  skipped: "text-slate-500 ring-border",
  stopped: "text-risk-high ring-risk-high/30",
};

const RISKS: RiskLevel[] = ["low", "medium", "high", "critical"];

export function WorkflowBuilder({
  initial,
  agents,
}: {
  initial: WorkflowDefinition[];
  agents: AgentKind[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<WorkflowDefinition>(emptyWorkflow());

  // New-block form state
  const [stepType, setStepType] = useState<StepType>("agent");
  const [stepAgent, setStepAgent] = useState<AgentKind>(agents[0] ?? "privacy");
  const [stepLabel, setStepLabel] = useState("");
  const [stepApproval, setStepApproval] = useState(false);
  const [condField, setCondField] = useState<ConditionField>("risk");
  const [condOp, setCondOp] = useState<ConditionOp>("gte");
  const [condValue, setCondValue] = useState("critical");
  const [condOnFalse, setCondOnFalse] = useState<"stop" | "continue">("stop");
  const [stepDelay, setStepDelay] = useState(24);
  const [stepUrl, setStepUrl] = useState("");

  // Dry-run sample event
  const [simRisk, setSimRisk] = useState<RiskLevel>("critical");
  const [simKind, setSimKind] = useState("doxxing");
  const [simScore, setSimScore] = useState(85);
  const [simSource, setSimSource] = useState("dark_web");

  const validation = validateWorkflow(draft);
  const preview = flowPreview(draft);
  const isEditing = draft.id !== "draft";
  const sampleEvent: SampleEvent = { risk: simRisk, kind: simKind, score: simScore, source: simSource };
  const simulation = simulateRun(draft, sampleEvent);

  function patchTrigger(p: Partial<WorkflowDefinition["trigger"]>) {
    setDraft((d) => ({ ...d, trigger: { ...d.trigger, ...p } }));
  }

  function onAddStep() {
    const label = stepLabel.trim() || STEP_META[stepType].label;
    const step: WorkflowStepDef = {
      id: newStepId(),
      type: stepType,
      label,
      ...(stepType === "agent" ? { agent: stepAgent } : {}),
      ...(stepType === "decision" ? { requiresApproval: stepApproval } : {}),
      ...(stepType === "condition" ? { condition: { field: condField, op: condOp, value: condValue }, onFalse: condOnFalse } : {}),
      ...(stepType === "wait" ? { delayHours: stepDelay } : {}),
      ...(stepType === "webhook" ? { url: stepUrl } : {}),
    };
    setDraft((d) => addStep(d, step));
    setStepLabel("");
    setStepApproval(false);
    setStepUrl("");
  }

  function resetDraft() {
    setDraft(emptyWorkflow());
  }

  function loadForEdit(def: WorkflowDefinition) {
    setDraft(def);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onSave() {
    if (!validation.valid) return;
    const toSave = draft;
    start(async () => {
      await saveWorkflowAction(toSave);
      resetDraft();
      router.refresh();
    });
  }

  function onToggle(id: string, enabled: boolean) {
    start(async () => {
      await toggleWorkflowAction(id, enabled);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    start(async () => {
      await deleteWorkflowAction(id);
      if (draft.id === id) resetDraft();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* ── Builder ─────────────────────────────────────────────────────── */}
      <Card className="p-4">
        <SectionTitle
          title={isEditing ? "Edit workflow" : "Compose a workflow"}
          subtitle="Trigger → ordered steps. Saved definitions run on the same orchestrator the fleet uses."
          action={
            isEditing ? (
              <button onClick={resetDraft} className="text-xs font-medium text-slate-400 hover:text-white">
                + New instead
              </button>
            ) : null
          }
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left: trigger + name */}
          <div className="space-y-4">
            <Field label="Workflow name">
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Critical breach response"
                className={inputCls}
              />
            </Field>

            <Field label="Trigger — when this runs">
              <select
                value={draft.trigger.kind}
                onChange={(e) => patchTrigger({ kind: e.target.value as TriggerKind })}
                className={inputCls}
              >
                {TRIGGERS.map((t) => (
                  <option key={t.kind} value={t.kind}>{t.label}</option>
                ))}
              </select>
            </Field>

            {(draft.trigger.kind === "threat_detected" || draft.trigger.kind === "exposure_found" || draft.trigger.kind === "incident_raised") && (
              <Field label="Minimum risk to fire">
                <select
                  value={draft.trigger.minRisk ?? "high"}
                  onChange={(e) => patchTrigger({ minRisk: e.target.value as RiskLevel })}
                  className={inputCls}
                >
                  {RISKS.map((r) => <option key={r} value={r}>{titleCase(r)} and above</option>)}
                </select>
              </Field>
            )}

            {draft.trigger.kind === "score_above" && (
              <Field label="Risk-score threshold (1–100)">
                <input
                  type="number" min={1} max={100}
                  value={draft.trigger.threshold ?? 70}
                  onChange={(e) => patchTrigger({ threshold: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
            )}

            {draft.trigger.kind === "scheduled" && (
              <Field label="Cadence">
                <select value={draft.trigger.cadence ?? "daily"} onChange={(e) => patchTrigger({ cadence: e.target.value })} className={inputCls}>
                  {["every 1h", "every 6h", "daily", "weekly"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            )}
          </div>

          {/* Right: add a step */}
          <div className="space-y-4 rounded-xl border border-border bg-bg-subtle/40 p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Add a step</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(STEP_META) as StepType[]).map((t) => {
                const M = STEP_META[t];
                const active = stepType === t;
                return (
                  <button
                    key={t}
                    onClick={() => setStepType(t)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition",
                      active
                        ? "border-brand/40 bg-brand/15 text-white"
                        : "border-border bg-bg-elevated/60 text-slate-400 hover:text-white",
                    )}
                  >
                    <M.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium">{M.label}</span>
                  </button>
                );
              })}
            </div>

            {stepType === "agent" && (
              <Field label="Which agent">
                <select value={stepAgent} onChange={(e) => setStepAgent(e.target.value as AgentKind)} className={inputCls}>
                  {agents.map((a) => <option key={a} value={a}>{titleCase(a)} agent</option>)}
                </select>
              </Field>
            )}

            {stepType === "condition" && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <select value={condField} onChange={(e) => setCondField(e.target.value as ConditionField)} className={inputCls} aria-label="Condition field">
                    {(["risk", "score", "kind", "source"] as ConditionField[]).map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select value={condOp} onChange={(e) => setCondOp(e.target.value as ConditionOp)} className={inputCls} aria-label="Operator">
                    {(["gte", "eq", "contains"] as ConditionOp[]).map((o) => <option key={o} value={o}>{o === "gte" ? "≥" : o}</option>)}
                  </select>
                  <input value={condValue} onChange={(e) => setCondValue(e.target.value)} className={inputCls} placeholder="value" aria-label="Value" />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  If not met:
                  <select value={condOnFalse} onChange={(e) => setCondOnFalse(e.target.value as "stop" | "continue")} className={cn(inputCls, "w-auto")}>
                    <option value="stop">stop the run</option>
                    <option value="continue">continue anyway</option>
                  </select>
                </label>
              </div>
            )}

            {stepType === "wait" && (
              <Field label="Delay (hours)">
                <input type="number" min={1} value={stepDelay} onChange={(e) => setStepDelay(Number(e.target.value))} className={inputCls} />
              </Field>
            )}

            {stepType === "webhook" && (
              <Field label="Webhook URL">
                <input value={stepUrl} onChange={(e) => setStepUrl(e.target.value)} placeholder="https://hooks.example.com/…" className={inputCls} />
              </Field>
            )}

            <Field label="Block label">
              <input
                value={stepLabel}
                onChange={(e) => setStepLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onAddStep(); }}
                placeholder={STEP_META[stepType].hint}
                className={inputCls}
              />
            </Field>

            {stepType === "decision" && (
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input type="checkbox" checked={stepApproval} onChange={(e) => setStepApproval(e.target.checked)} className="accent-brand" />
                Pause for human approval
              </label>
            )}

            <button
              onClick={onAddStep}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand/15 px-3 py-2 text-xs font-semibold text-brand-fg ring-1 ring-brand/30 hover:bg-brand/25"
            >
              <Plus className="h-3.5 w-3.5" /> Add step
            </button>
          </div>
        </div>

        {/* Steps list */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Steps · {draft.steps.length}
          </p>
          {draft.steps.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-bg-subtle/30 px-3 py-4 text-center text-xs text-slate-500">
              No steps yet — add the actions this workflow should run, in order.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {draft.steps.map((s, i) => {
                const M = STEP_META[s.type];
                return (
                  <li key={s.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[10px] font-bold text-slate-400">{i + 1}</span>
                    <M.icon className="h-3.5 w-3.5 shrink-0 text-brand-fg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{s.label}</p>
                      <p className="text-[10px] text-slate-500">
                        {M.label}
                        {s.agent && ` · ${titleCase(s.agent)} agent`}
                        {s.requiresApproval && " · needs approval"}
                        {s.condition && ` · if ${s.condition.field} ${s.condition.op === "gte" ? "≥" : s.condition.op} ${s.condition.value} → ${s.onFalse === "continue" ? "continue" : "stop"}`}
                        {s.type === "wait" && s.delayHours ? ` · ${s.delayHours}h` : ""}
                        {s.url && ` · ${s.url}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <IconBtn onClick={() => setDraft((d) => moveStep(d, s.id, -1))} disabled={i === 0} label="Move up"><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn onClick={() => setDraft((d) => moveStep(d, s.id, 1))} disabled={i === draft.steps.length - 1} label="Move down"><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn onClick={() => setDraft((d) => removeStep(d, s.id))} label="Remove" danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Flow preview */}
        <div className="mt-4 rounded-xl border border-border bg-bg-subtle/30 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <Zap className="h-3 w-3 text-brand" /> Flow preview
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {preview.map((label, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <span className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium ring-1",
                  i === 0
                    ? "bg-brand/12 text-brand-fg ring-brand/25"
                    : "bg-bg-elevated text-slate-300 ring-border",
                )}>
                  {label}
                </span>
                {i < preview.length - 1 && <ArrowRight className="h-3 w-3 text-slate-600" />}
              </span>
            ))}
          </div>
        </div>

        {/* Dry-run test panel */}
        {draft.steps.length > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-bg-subtle/30 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <Play className="h-3 w-3 text-brand" /> Test run · sample event
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Field label="risk">
                <select value={simRisk} onChange={(e) => setSimRisk(e.target.value as RiskLevel)} className={inputCls}>
                  {RISKS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="score"><input type="number" min={0} max={100} value={simScore} onChange={(e) => setSimScore(Number(e.target.value))} className={inputCls} /></Field>
              <Field label="kind"><input value={simKind} onChange={(e) => setSimKind(e.target.value)} className={inputCls} /></Field>
              <Field label="source"><input value={simSource} onChange={(e) => setSimSource(e.target.value)} className={inputCls} /></Field>
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
            <p className="mt-2 text-[10px] text-slate-500">
              {simulation.reached} of {draft.steps.length} block(s) would execute{simulation.stoppedAt != null ? ` · stops at block ${simulation.stoppedAt + 1}` : ""}.
            </p>
          </div>
        )}

        {/* Validation + save */}
        {!validation.valid && (
          <ul className="mt-3 space-y-1">
            {validation.errors.map((e) => (
              <li key={e} className="flex items-center gap-1.5 text-[11px] text-risk-medium">
                <AlertTriangle className="h-3 w-3 shrink-0" /> {e}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
              className="accent-brand"
            />
            Enable on save
          </label>
          <div className="flex-1" />
          <button
            onClick={onSave}
            disabled={!validation.valid || pending}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition",
              validation.valid && !pending
                ? "bg-brand text-white hover:bg-brand/90"
                : "cursor-not-allowed bg-bg-subtle text-slate-600",
            )}
          >
            <Save className="h-4 w-4" />
            {pending ? "Saving…" : isEditing ? "Update workflow" : "Save workflow"}
          </button>
        </div>
      </Card>

      {/* ── Saved workflows ─────────────────────────────────────────────── */}
      <Card className="p-4">
        <SectionTitle
          title="Saved workflows"
          subtitle={`${initial.length} definition${initial.length === 1 ? "" : "s"} — enabled workflows run automatically on matching events`}
        />
        {initial.length === 0 ? (
          <p className="text-sm text-slate-500">
            No saved workflows yet. Compose one above and save it — enabled definitions trigger on matching detections.
          </p>
        ) : (
          <ul className="space-y-2">
            {initial.map((w) => (
              <li key={w.id} className="rounded-xl border border-border bg-bg-subtle/40 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{w.name}</span>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1",
                      w.enabled
                        ? "bg-risk-low/12 text-risk-low ring-risk-low/30"
                        : "bg-bg-subtle text-slate-500 ring-border",
                    )}>
                      {w.enabled ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />}
                      {w.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onToggle(w.id, !w.enabled)} disabled={pending} className="rounded-md bg-bg-elevated px-2 py-1 text-[11px] font-medium text-slate-300 ring-1 ring-border hover:text-white disabled:opacity-50">
                      {w.enabled ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => loadForEdit(w)} disabled={pending} className="inline-flex items-center gap-1 rounded-md bg-bg-elevated px-2 py-1 text-[11px] font-medium text-slate-300 ring-1 ring-border hover:text-white disabled:opacity-50">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => onDelete(w.id)} disabled={pending} className="inline-flex items-center gap-1 rounded-md bg-risk-high/10 px-2 py-1 text-[11px] font-medium text-risk-high ring-1 ring-risk-high/25 hover:bg-risk-high/20 disabled:opacity-50">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Trigger: <span className="text-slate-400">{describeTrigger(w.trigger)}</span>
                  {" · "}{w.steps.length} step{w.steps.length === 1 ? "" : "s"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {w.steps.map((s, i) => (
                    <span key={s.id} className="inline-flex items-center gap-1">
                      <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-border">
                        {s.agent ? titleCase(s.agent) : titleCase(s.type)}
                      </span>
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

const inputCls =
  "w-full rounded-lg border border-border bg-bg-subtle/60 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function IconBtn({
  children, onClick, disabled, label, danger,
}: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-md p-1 transition disabled:opacity-30",
        danger ? "text-slate-500 hover:bg-risk-high/15 hover:text-risk-high" : "text-slate-500 hover:bg-bg-elevated hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
