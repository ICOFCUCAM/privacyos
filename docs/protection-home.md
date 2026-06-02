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

The surface (`mirror.tsx`) runs the three-beat activation: **input → animated
scan** (the scan-log reveals line by line) **→ the reveal** (exposure score,
per-category findings with the scary specifics, then the "we're already fixing
it" plan) → **Start my protection** → Protection Home.

## File map

```
src/lib/home/protection-home.ts        Protection Home engine (view-model aggregator)
src/lib/home/protection-home.test.ts   unit tests
src/lib/home/scary-mirror.ts           Scary Mirror activation engine
src/lib/home/scary-mirror.test.ts      unit tests
src/app/dashboard/home/page.tsx        the Protection Home surface
src/app/dashboard/scan/               the Scary Mirror (page + client + action + types)
src/components/nav.tsx                  "Protection" nav entry (top)
src/app/onboarding/actions.ts          redirects new users to /dashboard/scan
```
