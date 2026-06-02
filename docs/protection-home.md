# Protection Home — the Autonomous Protection Experience

**Surface:** `/dashboard/home` · **Engine:** `src/lib/home/protection-home.ts`
**Status:** implemented (the autonomous, outcome-first default face)

The customer's default face. Where the platform's 50+ operator surfaces let an
analyst *operate*, Protection Home lets a customer *approve* — it composes the
engines already running into four plain-language zones and hides the rest.

## The four zones

| Zone | Customer sees | Powered by (existing engines) |
|---|---|---|
| **① Status** | One protection score (0–100, higher = safer) + band + a human sentence | `data.riskScore` inverted to a protection score; band thresholds |
| **② What we're doing** | Live autonomous actions ("Removing 12 listings…", "Running 3 automated protections", "Recovering your reputation", "Monitoring 24/7") | Broker **removals** in flight · **workflows** (`buildWorkflows`/playbook runs) · reputation threats · always-on monitoring |
| **③ What needs you** | The short human queue only | Blocked **workflows** (awaiting_approval/escalated) + top **recommendations**, highest-risk first |
| **④ What we found** | The exposure mirror (exposures · active threats · removing · removed · top concern) | `data.exposures`, `data.threats`, **removals** status |
| **Footer** | "Tell us what to protect" → the Assistant | `/dashboard/assistant` (NL front door) |

## Engine

`buildProtectionHome(input)` is pure and unit-tested. Input is current engine
state (`riskScore`, `exposures`, `threats`, `recommendations`, `removals`,
`workflows`); output is the `ProtectionHome` view model (score, band, headline,
trend + delta, `doing[]`, `needsYou[]`, `found`). It never operates anything —
it only *projects* what the operator engines are already doing into outcomes.

- **Protection score** = `100 − riskScore.overall`, clamped; band: secure ≥85,
  protected ≥70, fair ≥50, else exposed.
- **Doing** is composed from removals-in-flight, active/complete workflows,
  reputation threats, plus an always-on monitoring baseline.
- **Needs you** merges blocked workflows with the highest-value recommendations,
  capped at 4, highest-risk first — this is the human-in-the-loop queue (the
  same approval mechanism as the Workflow Builder's Layer-8 gates).

## Design law

The customer **approves, never operates.** Cases, workflows, agents, compliance
cycles and reputation recovery all run underneath; Protection Home shows only
*handled / in-progress / needs-you*. The operator surfaces remain available
(Overview, Mission Control, Workflow Builder, …) for advanced/enterprise users —
hidden behind, not deleted.

## The Scary Mirror — the 5-minute activation moment

**Surface:** `/dashboard/scan` · **Engine:** `src/lib/home/scary-mirror.ts`

The highest-value moment in the product. A new customer enters their name and,
within seconds, sees *everything exposed about them* — then "…and we're already
fixing it." New users are redirected here straight after onboarding.

`buildScaryMirror(input)` turns the real discovery/exposure/threat data into the
reveal: it groups findings into six human categories (**data brokers, breaches,
dark web, exposed identifiers, search/reputation, impersonation**), scores the
exposure (the scary number), names the worst, and produces the
**auto-remediation plan** — one step per category, each mapped to the
**marketplace protection pack** that handles it (`remove-data-brokers`,
`breach-response`, `dark-web-watch`, `reputation-recovery`, …). Pure and
unit-tested.

The surface (`mirror.tsx`) runs the four-beat activation: **input → animated
scan** (the scan-log reveals line by line) **→ the reveal** (exposure score,
per-category findings with the scary specifics, then the "we're already fixing
it" plan) **→ consent** → Protection Home.

## Closing the loop — consent + auto-kickoff

The reveal's promise ("…and we're already fixing it") is made *true* by the
consent step. After the reveal, the customer makes **one decision** — the
autonomy mode (`src/lib/home/autonomy.ts`):

| Mode | Contract | Approval floor |
|---|---|---|
| **Autopilot** | "Just protect me — only ask on critical." | critical |
| **Check with me** (hybrid) | "Handle the routine; run the big calls by me." | high |
| **I'll decide** (advisor) | "Recommend everything; nothing runs without me." | low |

The mode is **defaulted by subscription tier** (`defaultModeForPlan`) — personal
→ Autopilot, executive → Hybrid, business → Advisor — and is both a UX setting
*and the consent that authorizes autonomous action.* On **Activate protection**,
`startProtectionAction` records the mode (a cookie) and **auto-installs the
marketplace protection packs the fix plan named** (`installListing` → saved
`WorkflowDefinition`s), then lands the customer in Protection Home with an
"activated" banner.

Protection Home reads the mode and applies it: `needsApproval(risk, mode)`
thresholds the **"what needs you"** queue, and anything below the floor is shown
as **auto-handled** ("Auto-resolving N recommendations for you"). The mode badge
links back to the scan to re-choose. The same approval mechanism is the
Workflow Builder's Layer-8 gates — one engine, surfaced as a consumer choice.

## Progressive disclosure, tier lens & activation analytics

- **Advanced toggle** (`src/components/nav.tsx`): the sidebar defaults to the
  ~6 **consumer surfaces** (Protection, Assistant, Exposure Inventory, Digital
  Identity, Broker Removals, Reputation, Reports, Notifications, Settings); every
  operator/enterprise surface is hidden behind an **"Advanced tools"** toggle
  (remembered in `localStorage`). One product, an autonomous face by default,
  the full console one click away.
- **Tier lens** (`src/lib/home/tiers.ts`): Protection Home reads the
  subscription and shows a depth-appropriate card — personal → "Protect my
  family", professional → reputation, executive → command center, business →
  Mission Control.
- **Activation analytics** (`src/lib/home/activation-analytics.ts`): the scan
  flow emits funnel events (`activation.revealed` with **time-to-first-finding**,
  `activation.consent_viewed`, plus the existing `activation.scan` /
  `activation.protect`) to the audit log; `activationFunnel(events)` rolls them
  up into reveal/consent/activation rates + TTFF median/p90.

## File map

```
src/lib/home/protection-home.ts        Protection Home engine (view-model aggregator)
src/lib/home/protection-home.test.ts   unit tests
src/lib/home/scary-mirror.ts           Scary Mirror activation engine
src/lib/home/scary-mirror.test.ts      unit tests
src/lib/home/autonomy.ts               autonomy mode (consent dial) + tier defaults
src/lib/home/autonomy.test.ts          unit tests
src/app/dashboard/home/page.tsx        the Protection Home surface (reads the mode)
src/app/dashboard/scan/               the Scary Mirror + consent (page + client + actions + types)
src/components/nav.tsx                  "Protection" nav entry (top)
src/app/onboarding/actions.ts          redirects new users to /dashboard/scan
```
