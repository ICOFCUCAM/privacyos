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

## 5. File map

```
src/lib/agents/workflow-builder.ts        model, ops, validation, simulateRun
src/lib/agents/workflow-builder.test.ts   unit tests (22)
src/lib/agents/workflow-store.ts          persistence (workflow_definitions)
src/components/workflow-flow.tsx          flow-graph canvas
src/app/dashboard/workflow-builder/       page.tsx + builder.tsx + actions.ts
```

## 6. Not yet built

- A **drag-and-drop** node canvas (today the canvas renders the ordered model;
  reordering is via move-up/down controls).
- True multi-branch fan-out (the condition primitive gates/continues a single
  ordered path rather than forking two independent sub-flows).
- A live **execution engine** wired to triggers (definitions persist and are
  simulated; autonomous execution rides the existing playbook machinery).
