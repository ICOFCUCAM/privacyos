# MCP setup — GitHub server with CI-logs access

This repo ships a project-scoped MCP config at [`.mcp.json`](../.mcp.json) so
Claude Code can read GitHub data **including CI/workflow logs** — the capability
that was missing when an E2E check failed and the logs couldn't be inspected.

## What it enables

The config points at GitHub's hosted MCP server and turns on these toolsets:

| Toolset | What it adds |
| --- | --- |
| `context` | viewer/auth context |
| `repos` | files, commits, branches |
| `pull_requests` | PR read/write, checks, status |
| `issues` | issues & comments |
| **`actions`** | **workflow runs + `get_job_logs`** (the CI-log reader) |

With `actions` on, a future session can run `get_job_logs` to read the exact
failure line from a red GitHub Actions check, instead of guessing.

## Activation (one-time, your side)

The config references a token via `${GITHUB_MCP_PAT}` — the token is **never**
stored in the committed file.

1. Create a GitHub fine-grained Personal Access Token with read access to this
   repo's **Actions** (read), **Contents** (read), **Pull requests** (read/write),
   **Issues** (read/write).
2. Expose it to Claude Code as the `GITHUB_MCP_PAT` environment variable:
   - **Claude Code on the web:** add `GITHUB_MCP_PAT` to the environment's
     variables (Environment → Variables).
   - **Local CLI:** `export GITHUB_MCP_PAT=github_pat_...` before launching, or
     put it in your shell profile.
3. Start a new session and approve the `github` MCP server when prompted.

To override locally without touching the committed file, copy `.mcp.json` to
`.mcp.local.json` (gitignored) and edit there.

## Security notes

- `.mcp.json` is safe to commit: it contains only an env-var **reference**, no
  secret.
- `.mcp.local.json` and `.claude/settings.local.json` are gitignored.
- If the hosted server isn't desired, the same `actions` toolset is available
  from the local Docker image `ghcr.io/github/github-mcp-server` with
  `GITHUB_TOOLSETS=actions`.
