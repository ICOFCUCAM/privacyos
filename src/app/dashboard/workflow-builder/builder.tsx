"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ArrowUp, ArrowDown, Bot, GitFork, Bell, FileText,
  Save, Power, PowerOff, Pencil, AlertTriangle, ArrowRight, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { cn, titleCase } from "@/lib/ui";
import type { AgentKind, RiskLevel } from "@/lib/types";
import {
  addStep, describeTrigger, emptyWorkflow, flowPreview, moveStep, newStepId,
  removeStep, validateWorkflow,
  type StepType, type TriggerKind, type WorkflowDefinition, type WorkflowStepDef,
} from "@/lib/agents/workflow-builder";
import { deleteWorkflowAction, saveWorkflowAction, toggleWorkflowAction } from "./actions";

const STEP_META: Record<StepType, { label: string; icon: LucideIcon; hint: string }> = {
  agent: { label: "Agent action", icon: Bot, hint: "An agent executes a task" },
  decision: { label: "Decision gate", icon: GitFork, hint: "Branch / hold for approval" },
  notify: { label: "Notify", icon: Bell, hint: "Alert the user or team" },
  report: { label: "Report", icon: FileText, hint: "Generate a record" },
};

const TRIGGERS: { kind: TriggerKind; label: string }[] = [
  { kind: "threat_detected", label: "Threat detected" },
  { kind: "exposure_found", label: "Exposure found" },
  { kind: "score_above", label: "Risk score above…" },
  { kind: "manual", label: "Manual / on-demand" },
];

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

  // New-step form state
  const [stepType, setStepType] = useState<StepType>("agent");
  const [stepAgent, setStepAgent] = useState<AgentKind>(agents[0] ?? "privacy");
  const [stepLabel, setStepLabel] = useState("");
  const [stepApproval, setStepApproval] = useState(false);

  const validation = validateWorkflow(draft);
  const preview = flowPreview(draft);
  const isEditing = draft.id !== "draft";

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
    };
    setDraft((d) => addStep(d, step));
    setStepLabel("");
    setStepApproval(false);
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

            {(draft.trigger.kind === "threat_detected" || draft.trigger.kind === "exposure_found") && (
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

            <Field label="Step label">
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
