"use client";

import { useState, useTransition } from "react";
import {
  Sparkles, Wand2, Loader2, ArrowRight, ShieldCheck, Crosshair, Bot, CheckCircle2,
} from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { WorkflowFlow } from "@/components/workflow-flow";
import { cn } from "@/lib/ui";
import type { GeneratedWorkflow } from "@/lib/agents/workflow-generator";
import { generateWorkflowAction, saveGeneratedWorkflowAction } from "./actions";

const EXAMPLES = [
  "Protect my CEO from doxxing.",
  "Remove my data from data brokers.",
  "We had a credential breach — respond.",
  "Protect my family's privacy online.",
  "Someone made a deepfake of our founder.",
];

export function WorkflowGenerator() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<GeneratedWorkflow | null>(null);
  const [pending, start] = useTransition();
  const [saving, startSave] = useTransition();

  function generate(text: string) {
    const p = text.trim();
    if (!p) return;
    setPrompt(p);
    start(async () => {
      const r = await generateWorkflowAction(p);
      setResult(r);
    });
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/15 text-brand">
            <Wand2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Describe what you want to protect</p>
            <p className="text-xs text-slate-500">Plain English — the generator picks the trigger, agents and actions for you.</p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") generate(prompt); }}
            placeholder="Protect my CEO from doxxing."
            className="flex-1 rounded-lg border border-border bg-bg-subtle px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-brand focus:outline-none"
          />
          <button
            onClick={() => generate(prompt)}
            disabled={pending || !prompt.trim()}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
              "bg-brand text-white hover:bg-brand/90 disabled:opacity-50",
            )}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {pending ? "Generating…" : "Generate"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              onClick={() => generate(e)}
              disabled={pending}
              className="rounded-full border border-border bg-bg-subtle/60 px-2.5 py-1 text-[11px] text-slate-400 hover:border-brand/40 hover:text-brand-fg disabled:opacity-50"
            >
              {e}
            </button>
          ))}
        </div>
      </Card>

      {result && (
        <Card className="p-4">
          <SectionTitle
            title="Generated workflow"
            subtitle={`"${result.prompt}"`}
            action={
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
                result.source === "ai" ? "text-brand-fg ring-brand/30 bg-brand/10" : "text-slate-400 ring-border",
              )}>
                {result.source === "ai" ? "AI-drafted" : "Auto-composed"}
              </span>
            }
          />

          {/* Detected intent */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Tag icon={ShieldCheck} label="Subject" value={result.persona} />
            <Tag icon={Crosshair} label="Threat" value={result.threat} />
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-bg-subtle/60 px-2 py-1 text-[11px] text-slate-300 ring-1 ring-border">
              <Bot className="h-3 w-3 text-brand" /> Confidence
              <span className="font-semibold text-white">{result.confidence}%</span>
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Flow */}
            <div className="rounded-xl border border-border bg-bg-subtle/30 p-3">
              <WorkflowFlow def={result.definition} />
            </div>

            {/* Rationale */}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">How it was built</p>
              <ul className="space-y-1.5">
                {result.rationale.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12px] text-slate-300">
                    <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-brand" /> {r}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => startSave(async () => { await saveGeneratedWorkflowAction(result.definition); })}
                disabled={saving}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save to my workflows
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Tag({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-bg-subtle/60 px-2 py-1 text-[11px] text-slate-300 ring-1 ring-border">
      <Icon className="h-3 w-3 text-brand" /> {label}
      <span className="font-semibold capitalize text-white">{value}</span>
    </span>
  );
}
