# Digital Identity OS

**Surface:** `/dashboard/identity`
**Engine:** `src/lib/identity/os/identity-os.ts`
**Status:** implemented

An **account-centric** view of the principal's credential exposure — distinct
from the signal-centric dark-web pillar in ExecutiveOS. Where dark-web lists
breaches as signals, Digital Identity OS organizes them into the **accounts a
defender actually hardens**: per-account takeover risk, password hygiene, a
composite identity risk score, and a restoration playbook. Pure, deterministic,
unit-tested. No keys.

---

## 1. Account inventory & ATO risk

`buildAccounts({ credentialLeaks, exposures, knownEmails })` groups breaches by
account and scores **account-takeover (ATO) risk** (0–100) per account from:
breach count, whether a **password** was exposed (`dataClasses`), the worst
breach severity, and dark-web presence. Known subject emails with no breach on
record appear as monitored/clean accounts. Sorted worst-first.

## 2. Password hygiene

`passwordHygiene(accounts)` → accounts with exposed passwords, **reuse risk**
(accounts breached more than once), and a 0–100 hygiene score (higher = better).

## 3. Identity risk score

`identityRisk(accounts)` → a composite 0–100 (max + mean ATO across breached
accounts), banded low/medium/high/critical, plus breached-account and
passwords-exposed counts.

## 4. Restoration playbook

`restorationPlaybook(risk)` → a deterministic, priority-ordered post-compromise
recovery plan (rotate + 2FA/passkeys → credit freeze → IdentityTheft.gov report
→ dark-web/credit monitoring → recovery-option audit), escalating with risk.

## 5. Surface

`/dashboard/identity`: identity-risk badge, breached / passwords-exposed /
hygiene KPIs, the **account inventory** (each account's ATO risk + password /
dark-web flags + data classes), and the **restoration playbook**.

## 6. Report

The **Digital Identity report** (`reports/build.ts`, type `identity`,
`/api/reports/identity`) renders the account inventory + restoration playbook.

## 7. File map

```
src/lib/identity/os/
  identity-os.ts        accounts, ATO risk, hygiene, identity risk, playbook
  identity-os.test.ts   unit tests (6)
src/app/dashboard/identity/page.tsx   Digital Identity OS surface
```

## 8. Not yet built (data-dependent)

- **Live 2FA / passkey coverage** per account (no inventory of MFA state today —
  the playbook recommends enabling it rather than reporting coverage).
- A keyed **HIBP-style** live breach lookup per identifier (today accounts come
  from the seeded `credentialLeaks`).
