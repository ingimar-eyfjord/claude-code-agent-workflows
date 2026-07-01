# Design Loop — portable, report-only browser-review system

**Status:** Design approved 2026-07-01 · awaiting implementation plan
**Author:** Ingimar + Claude (brainstorming session)
**Home:** this repo (`agents & workflows/`) is the canonical reusable library; agents also install to `~/.claude/agents/`
**Proving ground:** Dialogue One `data-platform` (Allocation Surface pencil redesign, in flight)

---

## 1. Problem & purpose

When a UI is implemented from a Pencil design, three things need checking and today they are scattered or missing:

1. **Does it look right** (layout, responsive breakpoints, overflow, contrast, broken states)?
2. **Does it run clean** (console errors, failed/slow network calls, performance regressions, memory/CPU hiccups that slow or kill the browser)?
3. **Does it match the design** (spacing, type scale, colour, component structure vs the Pencil source)?

Current state across the projects:
- **Guide Connect** has the mature-but-partial pattern: a `design-review` agent, a `frontend-verify` skill (Pencil + Playwright + Chrome DevTools "trio"), and a `pencil-to-code` skill. But Chrome DevTools MCP is *referenced yet never registered* in its `.mcp.json`.
- **homepage** registers a Playwright MCP under a wrong package name (`@anthropic/mcp-playwright`).
- **data-platform** has a `.mcp.json` that registers both servers but with **Windows-only `cmd /c` launchers** that won't run on the Mac, and it isn't enabled. Its only working visual review is a venv Python screenshot script with **no runtime introspection at all**.

**Goal:** one portable, reusable, **report-only** system of specialist browser-review agents that a coding session invokes after implementing a screen, producing a single consolidated report the human acts on. No auto-fixing.

## 2. Decisions (locked during brainstorming 2026-07-01)

| # | Decision | Choice |
|---|---|---|
| D1 | Where the loop runs | **Portable** — host-agnostic, runs wherever the session is, pointed at the running app (`localhost:8000` etc.) |
| D2 | Specialist decomposition | **Three fully-split** specialists (Visual Reviewer, Runtime Diagnostician, Design-Conformance) + an orchestrator; the coder stays separate and delegates |
| D3 | Loop autonomy | **Report-only** — specialists observe and report; no auto-edit of code/design |
| D4 | Packaging | **Global agents** in `~/.claude/agents/` + **staged** in this `agents & workflows` library + a project-memory note so other repos adopt when ready |
| D5 | OS-portable `.mcp.json` | **Bootstrap script** detects OS and writes the correct launcher (Mac `npx`, Windows `cmd /c npx`); versions **pinned**, never `@latest` |
| D6 | Reconciliation | **Consolidate** — supersede the ad-hoc `design-reviewer.md` / `frontend-verify` / `design-review` with this one canonical set, don't add a fourth overlapping thing |

## 3. Architecture & data flow

```
coder implements screen (from Pencil design)
        │
   /design-loop  ── reads .claude/design-loop.json + mints an auth session (→ storage-state)
        │
        ├─▶ visual-reviewer        (Playwright MCP)        ┐
        ├─▶ runtime-diagnostician  (Chrome DevTools MCP)   ├─ 3 isolated subagents, run in parallel
        └─▶ design-conformance     (Pencil MCP + shots)    ┘   each returns a STRUCTURED VERDICT, not raw noise
        │
   orchestrator merges the three → ONE consolidated report
        │
   report written to file + surfaced to the human → human decides fixes   ← report-only
```

The **orchestrator is the `/design-loop` skill itself** (run by the calling session) — not a fourth agent. It fans out to the three specialists and merges their verdicts.

Each specialist is a **subagent with its own context window**, so the expensive browser traffic (screenshots at 0.5–2 MB each, the ~18 k-token Chrome DevTools tool tax, performance traces) never pollutes the coder's or orchestrator's context — it returns only findings. This is the cross-source consensus pattern (Anthropic Agent SDK subagents; Steve Kinney "driving vs debugging").

**Token/latency discipline (baked into every agent's instructions):**
- Accessibility-tree **snapshot by default**; a screenshot only when a genuine *visual* judgment is needed.
- Chrome DevTools MCP loaded **only** inside `runtime-diagnostician` (quarantine its tool tax).
- Screenshots multimodally read and, for tall pages, cropped (PIL) to the region of interest — the existing data-platform habit.

## 4. The three specialist agents

Common output contract — every agent returns JSON the orchestrator can merge:
```json
{
  "agent": "visual-reviewer",
  "route": "/admin/assignment/allocationsurface/",
  "viewport": "1440x900",
  "verdict": "pass | warn | fail",
  "findings": [
    { "severity": "blocker|high|medium|low", "title": "...", "detail": "...",
      "evidence": "screenshot:allocation-1440.png | console:… | net:… | trace:LCP=…",
      "suggested_owner": "coder|design|infra" }
  ]
}
```

### 4.1 `visual-reviewer` (Playwright MCP)
- **Reads first:** the per-project config (routes, viewports), the Pencil design reference path (for context only — pixel conformance is 4.3's job).
- **Does:** navigate each route at 1440 / 768 / 375; a11y snapshot first; screenshot for visual judgment; check layout, overflow/clipping, responsive breakage, colour contrast, empty/error/loading states, focus/keyboard affordances.
- **Returns:** findings + screenshot refs per route×viewport.
- **Tools/MCP:** Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_resize`, `browser_click` for state exploration, `browser_console_messages` for obvious breakage). Caps: default + `vision` only if a canvas/SVG surface needs it.

### 4.2 `runtime-diagnostician` (Chrome DevTools MCP)
- **Reads first:** the per-project config (routes), any known perf budget (optional).
- **Does:** load each route and capture **console** errors/warnings (source-mapped stacks), **network** 4xx/5xx + slow requests (bodies when useful), a **performance trace** (LCP / CLS / INP) via `performance_start_trace`/`performance_stop_trace`/`performance_analyze_insight`, and flag CPU/memory hiccups or anything that slows or kills the page. Optional `emulate` CPU/network throttle to reproduce "slow" reports.
- **Returns:** severity-ranked runtime findings + the raw perf numbers.
- **Tools/MCP:** Chrome DevTools MCP (`navigate_page`, `list_console_messages`, `list_network_requests`, `get_network_request`, `performance_*`, optionally `take_heapsnapshot` behind `--memoryDebugging` only when investigating a leak).

### 4.3 `design-conformance` (Pencil MCP + Playwright screenshot)
- **Reads first:** the Pencil design file/frame named in config; the rendered screenshot(s) from the same routes.
- **Does:** compare rendered result to design intent — spacing/rhythm, type scale, colour tokens, component structure/hierarchy. Report deviations; does **not** score pixel-diff (no baseline system in phase 1).
- **Returns:** deviation list (design intent → rendered → gap).
- **Tools/MCP:** Pencil MCP (`mcp__pencil__*`) for the design source + Playwright MCP screenshot (or hand the shot from 4.1 to avoid a second capture).

## 5. Entry skill — `/design-loop`

A skill (installed globally, callable from any repo) that orchestrates:
1. Load `.claude/design-loop.json`; fail fast with a clear message if absent.
2. Verify the app is reachable at `baseUrl`; verify the MCP servers are connected (else instruct `/mcp`).
3. Mint an auth session via `sessionMintCmd` → export as Playwright `--storage-state` (reuse data-platform's `mint_review_session.py`).
4. Fan out the three specialists **in parallel** over the configured routes.
5. Merge into one **consolidated report** (severity-ranked, screenshots inline, perf numbers, per-route pass/warn/fail), write to `./design-loop-reports/<date>-<slug>.md`, and surface a summary to the human.
6. Stop. No fixing.

## 6. Config & wiring (the portable part)

### 6.1 Per-project config — `.claude/design-loop.json`
```json
{
  "baseUrl": "http://localhost:8000",
  "authMode": "storage-state",
  "sessionMintCmd": "docker compose exec -T django python manage.py shell < scripts/mint_review_session.py",
  "pencilDesignFile": "…/AllocationSurface.pen",
  "viewports": ["1440x900", "768x1024", "375x812"],
  "routes": [
    { "path": "/admin/assignment/allocationsurface/", "label": "Allocation Surface", "waitFor": ".as-matrix" }
  ]
}
```
This is what lets the **global** agents work in any repo with zero edits.

### 6.2 `.mcp.json` — pinned + OS-portable via bootstrap
- **Pin versions** (no `@latest`; tools disappear mid-session when packages update).
- A **`design-loop-setup`** bootstrap detects the OS and writes the correct launcher:
  - macOS/Linux: `{ "command": "npx", "args": ["-y", "@playwright/mcp@<pin>", "--config", ".claude/playwright-mcp.config.json"] }` and `{ "command": "npx", "args": ["-y", "chrome-devtools-mcp@<pin>"] }`
  - Windows: same but `{ "command": "cmd", "args": ["/c", "npx", "-y", …] }`
- It also enables the servers (`enabledMcpjsonServers`) and, on first run, installs Playwright's Chromium.
- This fixes data-platform's Windows-only file and homepage's wrong package name in one pass.

### 6.3 Playwright MCP config — `.claude/playwright-mcp.config.json`
Modelled on Guide Connect's working file: `browserName: chromium`, `headless:false` locally / `true` in CI, viewport from config, `allowedOrigins` restricted to dev hosts, `saveSession`, `storageState` for auth, `testIdAttribute`. Minimal caps by default; `vision`/`devtools` only where a specialist needs them.

### 6.4 Auth
Reuse the existing minted-session pattern (data-platform `scripts/mint_review_session.py`) → export as `--storage-state`. Agents never navigate live SSO/MFA (the single most-repeated auth gotcha in the research).

## 7. Reuse, staging & reconciliation

- Agents install to **`~/.claude/agents/`** (global, shared by all repos).
- Canonical source of truth lives **here** in `agents & workflows/.claude/agents/`; README + quick-reference updated with the new trio and the `/design-loop` skill.
- **Reconcile (D6):** supersede the existing `design-reviewer.md` here and Guide Connect's `design-review` agent + `frontend-verify`/`pencil-to-code` skills with this one canonical set. Migrate anything unique from them; leave a pointer so old invocations still resolve.
- **Project-memory note** in each active project so the team knows the library exists and how to adopt it.

## 8. Prove-it-first & scope

- **Validate in data-platform first** — the in-flight Allocation Surface pencil redesign is the live test case, so the system earns its keep immediately.
- **Keep** the venv `visual_review.py` as the no-MCP fallback (headless, needs no MCP approval); the MCP path becomes primary.

**Out of scope (YAGNI, possible phase 2):**
- Auto-fix loop (explicitly rejected — D3 report-only).
- CI integration (design for headless/`--isolated`, but don't wire CI now).
- Cross-browser (Chrome DevTools MCP is Chrome-only anyway).
- Visual-regression baseline/pixel-diffing.

## 9. Risks & open questions

- **Two browser controllers contending.** Point Playwright and Chrome DevTools at **separate** instances/contexts, never the same live browser, to avoid contention (research caveat).
- **Token cost.** Even quarantined, a full three-agent run over many routes is not cheap. Mitigate: snapshot-first, screenshot-on-demand, DevTools only in one agent, cap routes per run.
- **Pencil MCP availability on the review host.** `design-conformance` needs the Pencil MCP where it runs; confirm it's reachable on both Mac and Windows (Pencil MCP is registered globally in `~/.claude/settings.json`).
- **`.mcp.json` approval friction.** New MCP servers need per-project enable; the bootstrap handles it but the user may still get a one-time `/mcp` approval prompt.

## 10. References (state of practice, late 2025 / 2026)

- Chrome DevTools MCP — repo + tool reference + Chrome blog: `github.com/ChromeDevTools/chrome-devtools-mcp`, `developer.chrome.com/blog/chrome-devtools-mcp`
- Playwright MCP — `github.com/microsoft/playwright-mcp`, `playwright.dev/mcp` (snapshots, vision-mode)
- Steve Kinney, "Driving vs Debugging the Browser" — the division-of-labor framing
- test-lab.ai and qtrl.ai comparisons (token costs, CI vs local, flakiness, version pinning)
- scrolltest.medium.com — single-server `--caps=vision,devtools` "see + read" pass
- Builder.io — Playwright MCP + Claude Code self-QA loop; "say 'use Playwright MCP' explicitly"
- Anthropic — "Building agents with the Claude Agent SDK" (isolated-context subagents)
