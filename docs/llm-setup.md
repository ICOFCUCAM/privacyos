# Activating live AI (LLM provider)

PrivacyOS runs fully without an LLM key — the agents and the analyst briefing
use a deterministic provider. To turn on **real AI** (LLM-authored analyst
briefings, richer synthesis), add an API key.

## What's already wired
- `PRIVACYOS_LLM_PROVIDER` — preference: `anthropic` | `openai` | `mock`.
- The resolver auto-detects: if a key is present it uses it even when the
  preference is missing/misspelled, so a key is never wasted.
- The advisor falls back to a deterministic narrative if the call fails or
  returns unparseable output — live AI never breaks the page.

## To activate (Vercel → Settings → Environment Variables)
Add **one** of:

| Variable | Example value |
| --- | --- |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `OPENAI_API_KEY` | `sk-...` |

Keep `PRIVACYOS_LLM_PROVIDER=anthropic` (or `openai`) to match.

Optional — override the model without a code change:

| Variable | Default |
| --- | --- |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` |
| `OPENAI_MODEL` | `gpt-4o` |

Redeploy. The "Analyst briefing" badge on `/dashboard/recommendations` flips
from **Deterministic** to **Anthropic AI** / **OpenAI AI** once the key is live.

## Security
- Keys are server-only (read via `process.env`), never sent to the browser.
- `.env*.local` is gitignored; never commit a real key.
