# Workflow Builder

**Surface:** `/dashboard/workflow-builder`
**Engine:** `src/lib/agents/workflow-builder.ts`
**Persistence:** `workflow_definitions` table (RLS) via `workflow-store.ts`
**Status:** implemented

The visual automation platform — PrivacyOS's equivalent of Power Automate /
Zapier / ServiceNow Flow Designer / Cortex XSOAR playbook builder. Authors
compose a **trigger → ordered blocks** definition, see it as a live **flow
canvas**, **dry-run** it against a sample event, and save it to run on the same
orchestrator/playbook machinery the fleet uses. Pure, serializable, unit-tested.

---

## 1. Model (`workflow-builder.ts`)

A `WorkflowDefinition` = `{ id, name, trigger, steps[], enabled }`.

**Triggers (7):** `threat_detected`, `exposure_found`, `score_above`,
`case_opened`, `incident_raised`, `scheduled` (with `cadence`), `manual` — with
risk/threshold/cadence qualifiers.

**Blocks (9)**, catalogued by category in `STEP_CATALOG`:

| Category | Blocks |
|---|---|
| **action** | agent · open case · file takedown · generate report · notify |
| **logic** | condition · wait |
| **human** | approval (decision) |
| **integration** | webhook |

A **condition** block carries `{ field, op, value }` (field ∈ risk/score/kind/
source; op ∈ ≥/is/contains) plus `onFalse: stop | continue` — the branching
primitive. **wait** carries `delayHours`; **webhook** a `url`.

## 2. Pure operations

`addStep` / `removeStep` / `moveStep` (immutable), `validateWorkflow` (name,
≥1 block, per-block requirements — agent/condition/webhook/wait), `describeTrigger`
/ `describeStep` / `flowPreview` for labels, and `emptyWorkflow` for a fresh draft.

## 3. Dry-run simulator

`simulateRun(def, sampleEvent)` walks the blocks against a `{ risk, score, kind,
source }` event, evaluates conditions, and returns each block's outcome —
`run | paused | waited | skipped | stopped` — plus how many would execute and
where it stops. This powers the "test the playbook before enabling" panel.

## 4. Surface

`/dashboard/workflow-builder` (`builder.tsx`, client):
- **Trigger + block palette** (all 7 triggers, 9 blocks) with per-block config
  (condition predicate + on-false, wait delay, webhook URL, agent).
- **Flow canvas** (`components/workflow-flow.tsx`) — a vertical flow-designer
  view (trigger → nodes → terminal; condition branches drawn) that is **tinted
  live by the dry-run outcome**.
- **Test run** panel — edit the sample event and watch each block's outcome.
- **Validation + save/enable**, plus an editable list of saved workflows.

Saved definitions are persisted per-user and surface in Mission Control
(Workflows panel) and the workflow metrics.

## 5. Execution engine (Layer 10)

`executeWorkflow(def, event, now?)` is the engine that **runs** a definition and
stores a `WorkflowRun` record — distinct from `simulateRun` (a preview). It
walks the blocks in order and resolves a terminal `RunStatus`:

- **success** — every reached block ran
- **paused** — halted at the first human-approval gate
- **stopped** — a stop-on-false condition short-circuited the run
- **failed** — an invalid block (e.g. an agent step with no agent)

The record captures the six spec fields: **Start Time** (`startedAt`), **End
Time** (`endedAt`), **Duration** (`durationSec`, from a per-type cost model),
**Agent Activity** (per-agent action tallies), **Outputs** (one line per block
that ran) and **Errors**. `now` is injectable, so runs are deterministic. The
builder surfaces a **Run workflow** button and a run-record panel.

## 6. History (Layer 11)

**Surface:** `/dashboard/workflow-builder/history`
**Engine:** `workflow-history.ts` · **Store:** `workflow-history-store.ts`

Every execution is stored. The History view lists each run as a card —
`Workflow #<seq>`, **Started**, **Completed**, **Agents** (display names) and
**Outcome** — plus a stats strip (executions, success rate, awaiting approval,
agents engaged). The demo history is generated deterministically by running the
template catalog against representative events (`demoWorkflowHistory`); the
store reads `workflow_runs` when live and falls back to the demo set.

## 7. Analytics (Layer 12)

**Surface:** `/dashboard/workflow-builder/analytics`
**Engine:** `workflow-analytics.ts`

The ROI view over the stored history. `workflowAnalytics(entries)` derives six
metrics from the run records plus a transparent per-step value model
(`MANUAL_MINUTES`): **Time Saved** (analyst hours automated away), **Cases
Automated**, **Actions Automated**, **Success Rate**, **Agent Utilization**
(share of the fleet engaged, with a per-agent breakdown) and **Risk Reduction**
(risk-score points removed — template impact for successful runs). It also
surfaces a headline labour-cost-avoided figure (`ANALYST_HOURLY_USD`). Every
number reconciles with the history it summarizes.

## 8. Marketplace (Layer 13)

**Surface:** `/dashboard/workflow-builder/marketplace`
**Engine:** `workflow-marketplace.ts`

A consumer-facing storefront of installable workflow packs — named outcomes
("Protect My CEO", "Protect My Family", "Breach Response", "Reputation
Recovery", "Remove Data Brokers") each backed by one or more catalog templates
that install together. `installListing(listing)` instantiates every backing
template into a fresh, editable `WorkflowDefinition`; the `installListingAction`
server action saves them and drops the user into the builder. Listings carry
storefront metadata (tagline, category, installs, rating) and a
`listingSummary` (workflows, steps, agents, combined risk reduction). Pure and
unit-tested — every listing resolves to real templates and installs valid.

## 9. AI Workflow Generator (Layer 14)

**Surface:** `/dashboard/workflow-builder/generate`
**Engine:** `workflow-generator.ts`

Turns a plain-English request ("Protect my CEO from doxxing.") into a complete,
valid workflow automatically. Two paths behind one shape:

- `generateWorkflow(prompt)` — a pure, deterministic **intent engine**: it reads
  the **subject** (executive / family / business / self) and the **threat**
  (doxxing / breach / reputation / broker / deepfake / impersonation / threat)
  from the prompt and composes a coherent chain — Trigger → Discovery → persona
  agent → Risk assessment → (threat remediation) → Case → Legal → Report. It
  always returns a valid definition and needs no keys (the demo path + fallback).
- `generateWorkflowWithAI(prompt, provider)` — lets a configured LLM draft the
  plan, then **maps and validates** it through the same block model, falling
  back to the rules engine on any miss. The LLM can never emit an invalid
  workflow.

The surface takes a prompt (with example chips), shows the generated **flow
graph**, the detected subject/threat/confidence and a plain-language rationale,
and saves the result into the builder. For "Protect my CEO from doxxing." it
produces exactly: Trigger → Discovery Agent → Executive Protection Agent → Risk
Assessment → Case Creation → Legal Agent → Report.

## 10. Agent Collaboration Engine (Layer 15)

**Surface:** `/dashboard/workflow-builder/collaboration`
**Engine:** `agent-collaboration.ts`

The differentiator: most builders automate *actions* — PrivacyOS automates
*agents*. A collaboration is a chain of specialist agents that hand off to one
another, each consuming the shared context the prior agents built and
contributing its own artifact. The canonical example — **Deepfake Detected →
Deepfake → Threat Intelligence → Reputation → Legal → Incident Response → Case
Created → Executive Protection** — is modelled exactly.

`runCollaboration(c)` walks the chain and produces the handoff timeline: per
agent, what it **consumes** (resolved from upstream), what it **produces**, the
**shared context** after its turn, and whether any artifact was consumed before
being produced (a broken handoff → `coherent: false`).
`collaborationToDefinition(c)` lowers a collaboration into a runnable
`WorkflowDefinition`, so the same chain executes on the Layer-10 engine. The
surface renders the handoff graph and the growing shared context, and installs
the collaboration into the builder.

## 11. File map

```
src/lib/agents/workflow-builder.ts        model, ops, validation, simulateRun, executeWorkflow
src/lib/agents/workflow-builder.test.ts   unit tests
src/lib/agents/workflow-store.ts          definition persistence (workflow_definitions)
src/lib/agents/workflow-history.ts        Layer 11 — history projection + demo generation
src/lib/agents/workflow-history-store.ts  history persistence (workflow_runs) + demo fallback
src/lib/agents/workflow-history.test.ts   unit tests
src/lib/agents/workflow-analytics.ts      Layer 12 — ROI analytics over the history
src/lib/agents/workflow-analytics.test.ts unit tests
src/lib/agents/workflow-marketplace.ts    Layer 13 — installable storefront listings
src/lib/agents/workflow-marketplace.test.ts unit tests
src/lib/agents/workflow-generator.ts      Layer 14 — NL → workflow (rules + LLM seam)
src/lib/agents/workflow-generator.test.ts unit tests
src/lib/agents/agent-collaboration.ts     Layer 15 — multi-agent handoff engine
src/lib/agents/agent-collaboration.test.ts unit tests
src/components/workflow-flow.tsx          flow-graph canvas
src/app/dashboard/workflow-builder/       page.tsx + builder.tsx + actions.ts
src/app/dashboard/workflow-builder/history/page.tsx       History view
src/app/dashboard/workflow-builder/analytics/page.tsx     Analytics (ROI) view
src/app/dashboard/workflow-builder/marketplace/           Marketplace view + install action
src/app/dashboard/workflow-builder/generate/              AI Generator (page + client + actions)
src/app/dashboard/workflow-builder/collaboration/         Agent Collaboration (page + client + actions)
```

## 12. Not yet built

- A **drag-and-drop** node canvas (today the canvas renders the ordered model;
  reordering is via move-up/down controls and drag-reorder of the step list).
- True multi-branch fan-out (the condition primitive gates/continues a single
  ordered path rather than forking two independent sub-flows).
- Persisting builder-initiated runs to `workflow_runs` (the store reads the
  table when present; the demo history is generated from the template catalog).
