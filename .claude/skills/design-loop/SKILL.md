---
name: design-loop
description: Run the three-specialist browser review (visual, runtime, design-conformance) against a running web UI and produce ONE consolidated, report-only findings report. Use after implementing a screen from a Pencil design, when the user asks to review/verify a running UI, or asks to check a page for visual/runtime/design issues.
---

# Design Loop

Report-only. You orchestrate; you never edit app code or design files.

## Steps
1. **Load config.** Read `.claude/design-loop.json`. Validate it: `node <lib>/tools/design-loop/validate-config.js` semantics (or require the module). If missing/invalid, stop and tell the user exactly what to fix.
2. **Check reachability + MCP.** Confirm `baseUrl` responds. Confirm `playwright` and `chrome-devtools` MCP servers are connected; if not, tell the user to run `tools/design-loop/setup.js` then `/mcp`.
3. **Mint auth** (if `authMode: storage-state`): run `sessionMintCmd`, capture the session, write a Playwright storage-state file to `./design-loop-reports/.auth/state.json`. Never navigate live SSO.
4. **Fan out in parallel** — dispatch all three agents at once (single message, three Agent calls), each with its brief:
   - `visual-reviewer` ← `{ baseUrl, routes, viewports, storageStatePath, pencilContextNote }`
   - `runtime-diagnostician` ← `{ baseUrl, routes, perfBudget? }`
   - `design-conformance` ← `{ baseUrl, routes, pencilDesignFile, storageStatePath }` (skip if no `pencilDesignFile`)
5. **Merge** the three findings JSONs into the report template. Compute per-route verdicts (worst-of the three) and an overall verdict. Rank blockers/high first.
6. **Write** `./design-loop-reports/<YYYY-MM-DD>-<slug>.md` and print a short summary + the path. STOP. Do not fix anything.

## Rules
- Report-only — no edits to code or design.
- Prefer a11y snapshots; screenshots only for visual judgment (visual-reviewer already enforces this).
- Keep Chrome DevTools MCP inside runtime-diagnostician only.
