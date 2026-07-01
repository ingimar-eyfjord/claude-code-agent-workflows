# Design Loop — Browser-Review System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portable, report-only system of three specialist browser-review agents (visual, runtime, design-conformance) plus a `/design-loop` orchestration skill, installed globally and staged in this reusable library.

**Architecture:** A `/design-loop` skill reads a per-project `.claude/design-loop.json`, mints an auth session, and fans out to three isolated subagents — `visual-reviewer` (Playwright MCP), `runtime-diagnostician` (Chrome DevTools MCP), `design-conformance` (Pencil MCP + screenshots). Each returns a structured JSON verdict; the skill merges them into one consolidated report. No auto-fixing. A cross-platform Node bootstrap writes the OS-correct, version-pinned `.mcp.json`.

**Tech Stack:** Node.js (bootstrap + config validator, built-in `node:test`), Claude Code agent + skill markdown, Playwright MCP, Chrome DevTools MCP, Pencil MCP.

## Global Constraints

- **Report-only.** No agent or the skill may edit application code or design files. Output is a report the human acts on.
- **Version-pinned MCP servers.** Never `@latest` in any generated `.mcp.json`. Pin to the exact version resolved at setup time.
- **OS-portable.** All generated config must work on macOS/Linux (`command: npx`) and Windows (`command: cmd`, `args: ["/c", "npx", …]`). One `.mcp.json` per machine, written by the bootstrap.
- **Token discipline.** Accessibility-tree snapshot by default; screenshot only for genuine visual judgment. Chrome DevTools MCP is loaded only inside `runtime-diagnostician`.
- **Auth via storage-state.** Reuse a minted session exported as Playwright `--storage-state`. Agents never navigate live SSO/MFA.
- **Global agents, staged canonically here.** Agents install to `~/.claude/agents/`; the source of truth is `agents & workflows/.claude/agents/`.
- **Separate browser instances.** Playwright and Chrome DevTools MCP must never drive the same live browser instance (contention). Each uses its own context.
- **Canonical paths:** bootstrap `agents & workflows/tools/design-loop/`, agents `agents & workflows/.claude/agents/`, skill `agents & workflows/.claude/skills/design-loop/`.

---

## File Structure

**Create:**
- `agents & workflows/tools/design-loop/build-mcp-config.js` — pure function: `(platform, pins) → mcpServers object`
- `agents & workflows/tools/design-loop/build-mcp-config.test.js` — `node:test` unit tests
- `agents & workflows/tools/design-loop/setup.js` — CLI: resolves+pins versions, calls builder, writes `.mcp.json`, enables servers, installs Chromium
- `agents & workflows/tools/design-loop/validate-config.js` — pure function: `(configObject) → {valid, errors[]}` for `.claude/design-loop.json`
- `agents & workflows/tools/design-loop/validate-config.test.js` — `node:test` unit tests
- `agents & workflows/tools/design-loop/design-loop.schema.json` — JSON Schema for `.claude/design-loop.json`
- `agents & workflows/tools/design-loop/playwright-mcp.config.template.json` — Playwright MCP config template
- `agents & workflows/.claude/agents/visual-reviewer.md`
- `agents & workflows/.claude/agents/runtime-diagnostician.md`
- `agents & workflows/.claude/agents/design-conformance.md`
- `agents & workflows/.claude/skills/design-loop/SKILL.md`
- `agents & workflows/tools/design-loop/report-template.md` — consolidated report skeleton

**Modify:**
- `agents & workflows/README.md` — document the trio + skill; supersede `design-reviewer.md`
- `agents & workflows/quick-reference.md` — add `/design-loop` entry
- `agents & workflows/.claude/agents/design-reviewer.md` — convert to a pointer/deprecation stub

**Install (copy at setup):**
- The three agent files → `~/.claude/agents/`
- The skill → `~/.claude/skills/design-loop/`

---

## Task 1: OS-portable MCP config builder (pure function + tests)

**Files:**
- Create: `agents & workflows/tools/design-loop/build-mcp-config.js`
- Test: `agents & workflows/tools/design-loop/build-mcp-config.test.js`

**Interfaces:**
- Produces: `buildMcpConfig(platform: 'darwin'|'linux'|'win32', pins: {playwright: string, chromeDevtools: string}) → { mcpServers: {...} }`. Later tasks (setup.js) consume this.

- [ ] **Step 1: Write the failing test**

```js
// build-mcp-config.test.js
const { test } = require('node:test')
const assert = require('node:assert')
const { buildMcpConfig } = require('./build-mcp-config.js')

const PINS = { playwright: '0.0.41', chromeDevtools: '0.6.0' }

test('darwin uses npx directly', () => {
  const cfg = buildMcpConfig('darwin', PINS)
  assert.strictEqual(cfg.mcpServers.playwright.command, 'npx')
  assert.deepStrictEqual(cfg.mcpServers.playwright.args,
    ['-y', '@playwright/mcp@0.0.41', '--config', '.claude/playwright-mcp.config.json'])
  assert.strictEqual(cfg.mcpServers['chrome-devtools'].command, 'npx')
  assert.deepStrictEqual(cfg.mcpServers['chrome-devtools'].args,
    ['-y', 'chrome-devtools-mcp@0.6.0'])
})

test('win32 wraps in cmd /c', () => {
  const cfg = buildMcpConfig('win32', PINS)
  assert.strictEqual(cfg.mcpServers.playwright.command, 'cmd')
  assert.deepStrictEqual(cfg.mcpServers.playwright.args,
    ['/c', 'npx', '-y', '@playwright/mcp@0.0.41', '--config', '.claude/playwright-mcp.config.json'])
  assert.strictEqual(cfg.mcpServers['chrome-devtools'].command, 'cmd')
  assert.deepStrictEqual(cfg.mcpServers['chrome-devtools'].args,
    ['/c', 'npx', '-y', 'chrome-devtools-mcp@0.6.0'])
})

test('never emits @latest', () => {
  const json = JSON.stringify(buildMcpConfig('darwin', PINS))
  assert.ok(!json.includes('@latest'))
})

test('throws on missing pins', () => {
  assert.throws(() => buildMcpConfig('darwin', { playwright: '0.0.41' }), /pin/i)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/design-loop/build-mcp-config.test.js`
Expected: FAIL — `Cannot find module './build-mcp-config.js'`

- [ ] **Step 3: Write minimal implementation**

```js
// build-mcp-config.js
function buildMcpConfig(platform, pins) {
  if (!pins || !pins.playwright || !pins.chromeDevtools) {
    throw new Error('Missing version pin(s): both playwright and chromeDevtools required')
  }
  const pwArgs = ['-y', `@playwright/mcp@${pins.playwright}`, '--config', '.claude/playwright-mcp.config.json']
  const cdArgs = ['-y', `chrome-devtools-mcp@${pins.chromeDevtools}`]
  const wrap = (args) => platform === 'win32'
    ? { command: 'cmd', args: ['/c', 'npx', ...args] }
    : { command: 'npx', args }
  return {
    mcpServers: {
      playwright: { type: 'stdio', ...wrap(pwArgs), env: {} },
      'chrome-devtools': { type: 'stdio', ...wrap(cdArgs), env: {} },
    },
  }
}
module.exports = { buildMcpConfig }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/design-loop/build-mcp-config.test.js`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add "tools/design-loop/build-mcp-config.js" "tools/design-loop/build-mcp-config.test.js"
git commit -m "feat(design-loop): OS-portable, version-pinned MCP config builder"
```

---

## Task 2: Per-project config validator (pure function + tests + schema)

**Files:**
- Create: `agents & workflows/tools/design-loop/validate-config.js`
- Create: `agents & workflows/tools/design-loop/design-loop.schema.json`
- Test: `agents & workflows/tools/design-loop/validate-config.test.js`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: `validateDesignLoopConfig(obj) → { valid: boolean, errors: string[] }`. Consumed by the `/design-loop` skill (Task 7) to fail fast.

- [ ] **Step 1: Write the failing test**

```js
// validate-config.test.js
const { test } = require('node:test')
const assert = require('node:assert')
const { validateDesignLoopConfig } = require('./validate-config.js')

const GOOD = {
  baseUrl: 'http://localhost:8000',
  authMode: 'storage-state',
  sessionMintCmd: 'docker compose exec -T django python manage.py shell < scripts/mint_review_session.py',
  pencilDesignFile: '/x/AllocationSurface.pen',
  viewports: ['1440x900', '375x812'],
  routes: [{ path: '/admin/', label: 'Admin', waitFor: 'body' }],
}

test('accepts a well-formed config', () => {
  const r = validateDesignLoopConfig(GOOD)
  assert.strictEqual(r.valid, true)
  assert.deepStrictEqual(r.errors, [])
})

test('rejects missing baseUrl', () => {
  const r = validateDesignLoopConfig({ ...GOOD, baseUrl: undefined })
  assert.strictEqual(r.valid, false)
  assert.ok(r.errors.some(e => /baseUrl/.test(e)))
})

test('rejects non-http baseUrl', () => {
  const r = validateDesignLoopConfig({ ...GOOD, baseUrl: 'ftp://x' })
  assert.ok(r.errors.some(e => /baseUrl.*http/.test(e)))
})

test('rejects empty routes', () => {
  const r = validateDesignLoopConfig({ ...GOOD, routes: [] })
  assert.ok(r.errors.some(e => /routes/.test(e)))
})

test('rejects malformed viewport', () => {
  const r = validateDesignLoopConfig({ ...GOOD, viewports: ['big'] })
  assert.ok(r.errors.some(e => /viewport/.test(e)))
})

test('rejects unknown authMode', () => {
  const r = validateDesignLoopConfig({ ...GOOD, authMode: 'magic' })
  assert.ok(r.errors.some(e => /authMode/.test(e)))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/design-loop/validate-config.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```js
// validate-config.js
const VIEWPORT_RE = /^\d{2,5}x\d{2,5}$/
const AUTH_MODES = ['storage-state', 'none']

function validateDesignLoopConfig(c) {
  const errors = []
  if (!c || typeof c !== 'object') return { valid: false, errors: ['config must be an object'] }
  if (typeof c.baseUrl !== 'string') errors.push('baseUrl is required (string)')
  else if (!/^https?:\/\//.test(c.baseUrl)) errors.push('baseUrl must start with http:// or https://')
  if (!AUTH_MODES.includes(c.authMode)) errors.push(`authMode must be one of: ${AUTH_MODES.join(', ')}`)
  if (c.authMode === 'storage-state' && typeof c.sessionMintCmd !== 'string')
    errors.push('sessionMintCmd is required (string) when authMode=storage-state')
  if (!Array.isArray(c.viewports) || c.viewports.length === 0) errors.push('viewports must be a non-empty array')
  else c.viewports.forEach(v => { if (!VIEWPORT_RE.test(v)) errors.push(`viewport "${v}" must look like 1440x900`) })
  if (!Array.isArray(c.routes) || c.routes.length === 0) errors.push('routes must be a non-empty array')
  else c.routes.forEach((r, i) => {
    if (!r || typeof r.path !== 'string' || !r.path.startsWith('/')) errors.push(`routes[${i}].path must be a string starting with /`)
  })
  return { valid: errors.length === 0, errors }
}
module.exports = { validateDesignLoopConfig }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/design-loop/validate-config.test.js`
Expected: PASS — 6 tests

- [ ] **Step 5: Write the JSON Schema (documentation mirror of the validator)**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "design-loop.json",
  "type": "object",
  "required": ["baseUrl", "authMode", "viewports", "routes"],
  "properties": {
    "baseUrl": { "type": "string", "pattern": "^https?://" },
    "authMode": { "enum": ["storage-state", "none"] },
    "sessionMintCmd": { "type": "string" },
    "pencilDesignFile": { "type": "string" },
    "viewports": { "type": "array", "minItems": 1, "items": { "type": "string", "pattern": "^\\d{2,5}x\\d{2,5}$" } },
    "routes": {
      "type": "array", "minItems": 1,
      "items": {
        "type": "object", "required": ["path"],
        "properties": {
          "path": { "type": "string", "pattern": "^/" },
          "label": { "type": "string" },
          "waitFor": { "type": "string" }
        }
      }
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add "tools/design-loop/validate-config.js" "tools/design-loop/validate-config.test.js" "tools/design-loop/design-loop.schema.json"
git commit -m "feat(design-loop): per-project config validator + JSON schema"
```

---

## Task 3: Setup CLI + Playwright MCP config template

**Files:**
- Create: `agents & workflows/tools/design-loop/setup.js`
- Create: `agents & workflows/tools/design-loop/playwright-mcp.config.template.json`

**Interfaces:**
- Consumes: `buildMcpConfig` (Task 1).
- Produces: a runnable `node tools/design-loop/setup.js` that writes `./.mcp.json` and `./.claude/playwright-mcp.config.json` into the *target project's* CWD, and prints the enable instruction.

- [ ] **Step 1: Write the Playwright MCP config template**

Model on the working Guide Connect file. `{{VIEWPORT_W}}`/`{{VIEWPORT_H}}`/`{{ALLOWED_ORIGINS}}` are substituted by `setup.js` from the project config's first viewport + baseUrl.

```json
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": { "headless": false },
    "contextOptions": { "viewport": { "width": {{VIEWPORT_W}}, "height": {{VIEWPORT_H}} } }
  },
  "capabilities": ["core"],
  "network": { "allowedOrigins": {{ALLOWED_ORIGINS}} },
  "codegen": "none",
  "saveSession": true,
  "outputDir": "./design-loop-reports/.playwright",
  "imageResponses": "auto",
  "testIdAttribute": "data-testid"
}
```

- [ ] **Step 2: Write `setup.js`**

```js
#!/usr/bin/env node
// Resolves + pins MCP versions, writes OS-correct .mcp.json and the Playwright MCP config
// into the CURRENT PROJECT's working directory. Run from the target repo root.
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { buildMcpConfig } = require('./build-mcp-config.js')
const { validateDesignLoopConfig } = require('./validate-config.js')

function resolvePin(pkg) {
  const v = execSync(`npm view ${pkg} version`, { encoding: 'utf8' }).trim()
  if (!/^\d+\.\d+\.\d+/.test(v)) throw new Error(`Could not resolve version for ${pkg}: "${v}"`)
  return v
}

function main() {
  const cwd = process.cwd()
  const cfgPath = path.join(cwd, '.claude', 'design-loop.json')
  if (!fs.existsSync(cfgPath)) {
    console.error(`Missing ${cfgPath}. Create it first (see design-loop.schema.json).`)
    process.exit(1)
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
  const { valid, errors } = validateDesignLoopConfig(cfg)
  if (!valid) { console.error('Invalid design-loop.json:\n- ' + errors.join('\n- ')); process.exit(1) }

  const pins = { playwright: resolvePin('@playwright/mcp'), chromeDevtools: resolvePin('chrome-devtools-mcp') }
  console.log(`Pinning @playwright/mcp@${pins.playwright}, chrome-devtools-mcp@${pins.chromeDevtools}`)

  fs.writeFileSync(path.join(cwd, '.mcp.json'), JSON.stringify(buildMcpConfig(process.platform, pins), null, 2) + '\n')

  const [w, h] = cfg.viewports[0].split('x')
  const origin = new URL(cfg.baseUrl).origin
  const allowed = JSON.stringify([origin, `${origin}:*`, 'http://localhost:*'])
  const tpl = fs.readFileSync(path.join(__dirname, 'playwright-mcp.config.template.json'), 'utf8')
    .replace('{{VIEWPORT_W}}', w).replace('{{VIEWPORT_H}}', h).replace('{{ALLOWED_ORIGINS}}', allowed)
  fs.mkdirSync(path.join(cwd, '.claude'), { recursive: true })
  fs.writeFileSync(path.join(cwd, '.claude', 'playwright-mcp.config.json'), tpl)

  // Install Chromium for Playwright (idempotent)
  try { execSync('npx -y playwright install chromium', { stdio: 'inherit' }) } catch (e) { console.warn('playwright install chromium failed; run manually.') }

  console.log('\nWrote .mcp.json + .claude/playwright-mcp.config.json.')
  console.log('Now enable the servers: run `/mcp` in Claude Code and approve `playwright` + `chrome-devtools`,')
  console.log('or add them to .claude/settings.local.json `enabledMcpjsonServers`.')
}
main()
```

- [ ] **Step 3: Smoke-test setup against a scratch config**

Run:
```bash
mkdir -p /tmp/dl-smoke/.claude && cd /tmp/dl-smoke
printf '%s' '{"baseUrl":"http://localhost:8000","authMode":"none","viewports":["1440x900"],"routes":[{"path":"/"}]}' > .claude/design-loop.json
node "$OLDPWD/tools/design-loop/setup.js"
cat .mcp.json
```
Expected: prints pinned versions; `.mcp.json` exists with **no `@latest`** and the OS-correct `command`; `.claude/playwright-mcp.config.json` has viewport `1440x900` and an `allowedOrigins` array.

- [ ] **Step 4: Verify the guard path**

Run: `cd /tmp && rm -rf /tmp/dl-empty && mkdir /tmp/dl-empty && cd /tmp/dl-empty && node "<repo>/tools/design-loop/setup.js"; echo "exit=$?"`
Expected: prints "Missing …/design-loop.json" and `exit=1`.

- [ ] **Step 5: Commit**

```bash
git add "tools/design-loop/setup.js" "tools/design-loop/playwright-mcp.config.template.json"
git commit -m "feat(design-loop): setup CLI writes pinned, OS-correct MCP + Playwright config"
```

---

## Task 4: `visual-reviewer` agent

**Files:**
- Create: `agents & workflows/.claude/agents/visual-reviewer.md`

**Interfaces:**
- Produces: an agent that, given `{baseUrl, routes[], viewports[], storageStatePath}`, returns the shared findings JSON (see spec §4) with `agent: "visual-reviewer"`.

- [ ] **Step 1: Write the agent file**

Frontmatter + body. Tools limited to Playwright MCP + Read (for screenshots) + the config. Body must instruct: load storage-state; per route × viewport → `browser_navigate`, `browser_resize`, `browser_snapshot` (a11y first), `browser_take_screenshot` only when a visual call is needed; check layout/overflow/responsive/contrast/empty+error states; **do not** report console/network/perf (that's the diagnostician). Output ONLY the findings JSON.

```markdown
---
name: visual-reviewer
description: Report-only visual review of a running web UI via Playwright MCP — layout, responsive breakpoints, overflow, contrast, broken/empty states across viewports. Returns structured findings JSON, never edits code.
tools: Read, mcp__playwright__browser_navigate, mcp__playwright__browser_resize, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_click, mcp__playwright__browser_console_messages
---

You are a visual QA specialist. You are given a JSON brief: `{ baseUrl, routes, viewports, storageStatePath, pencilContextNote }`.

Read first: nothing else — the brief is self-contained.

Method, per route × viewport:
1. Navigate to `baseUrl + route.path`. If a `route.waitFor` selector is given, ensure it's present.
2. Resize to the viewport. Take an accessibility snapshot FIRST (cheap, structured).
3. Take a screenshot ONLY when a genuine visual judgment needs pixels (alignment, spacing, overflow, contrast). Read it back and inspect it.
4. Exercise obvious states you can reach without data mutation (hover a control, open a disclosed panel) to catch broken/empty/error states.

Check: layout integrity, clipping/overflow, responsive breakage at 375/768/1440, colour contrast, focus/keyboard affordance, empty & error states.

Do NOT report console errors, network failures, or performance — those belong to runtime-diagnostician. Do NOT edit anything.

Return ONLY this JSON (one object per route×viewport, collected in `results`):
{ "agent": "visual-reviewer", "results": [ { "route": "...", "viewport": "WxH", "verdict": "pass|warn|fail",
  "findings": [ { "severity": "blocker|high|medium|low", "title": "...", "detail": "...",
  "evidence": "screenshot:<name> | snapshot-note", "suggested_owner": "coder|design|infra" } ] } ] }
```

- [ ] **Step 2: Validate the frontmatter loads**

Run: `head -6 ".claude/agents/visual-reviewer.md"`
Expected: valid YAML frontmatter with `name: visual-reviewer` and a `tools:` list containing only Playwright MCP + Read.

- [ ] **Step 3: Commit**

```bash
git add ".claude/agents/visual-reviewer.md"
git commit -m "feat(design-loop): visual-reviewer agent (Playwright MCP, report-only)"
```

---

## Task 5: `runtime-diagnostician` agent

**Files:**
- Create: `agents & workflows/.claude/agents/runtime-diagnostician.md`

**Interfaces:**
- Produces: an agent returning findings JSON with `agent: "runtime-diagnostician"`, including a `perf` block per route.

- [ ] **Step 1: Write the agent file**

```markdown
---
name: runtime-diagnostician
description: Report-only runtime diagnosis of a running web UI via Chrome DevTools MCP — console errors, network failures/slow requests, performance traces (LCP/CLS/INP), CPU/memory hiccups. Returns structured findings JSON, never edits code.
tools: Read, mcp__chrome-devtools__navigate_page, mcp__chrome-devtools__list_console_messages, mcp__chrome-devtools__list_network_requests, mcp__chrome-devtools__get_network_request, mcp__chrome-devtools__performance_start_trace, mcp__chrome-devtools__performance_stop_trace, mcp__chrome-devtools__performance_analyze_insight, mcp__chrome-devtools__emulate
---

You are a runtime diagnostics specialist. Brief: `{ baseUrl, routes, perfBudget? }`.

You are the ONLY agent that loads Chrome DevTools MCP — keep the run tight.

Method, per route:
1. `navigate_page` to `baseUrl + route.path`.
2. `list_console_messages` — capture errors and warnings with source-mapped stacks. Ignore benign framework noise; flag real errors.
3. `list_network_requests` — flag any 4xx/5xx and any request slower than 1s; use `get_network_request` for bodies only when it clarifies a failure.
4. Wrap a reload in `performance_start_trace` / `performance_stop_trace`, then `performance_analyze_insight` — report LCP, CLS, INP and any flagged insight. Compare to `perfBudget` if provided.
5. If a "slow/janky" symptom is suspected, `emulate` a 4x CPU slowdown and re-measure; note the delta.

Do NOT do visual/layout judgment (that's visual-reviewer). Do NOT edit anything. Do NOT take heap snapshots unless explicitly asked to chase a leak.

Return ONLY this JSON:
{ "agent": "runtime-diagnostician", "results": [ { "route": "...", "verdict": "pass|warn|fail",
  "perf": { "lcp_ms": 0, "cls": 0, "inp_ms": 0 },
  "findings": [ { "severity": "blocker|high|medium|low", "title": "...", "detail": "...",
  "evidence": "console:<msg> | net:<status> <url> | trace:<insight>", "suggested_owner": "coder|infra" } ] } ] }
```

- [ ] **Step 2: Validate the frontmatter loads**

Run: `head -6 ".claude/agents/runtime-diagnostician.md"`
Expected: valid frontmatter; `tools:` lists only Chrome DevTools MCP + Read (no Playwright — separate browser instance per the global constraint).

- [ ] **Step 3: Commit**

```bash
git add ".claude/agents/runtime-diagnostician.md"
git commit -m "feat(design-loop): runtime-diagnostician agent (Chrome DevTools MCP, report-only)"
```

---

## Task 6: `design-conformance` agent

**Files:**
- Create: `agents & workflows/.claude/agents/design-conformance.md`

**Interfaces:**
- Produces: an agent returning findings JSON with `agent: "design-conformance"`, comparing Pencil design intent to rendered screenshots.

- [ ] **Step 1: Discover the Pencil MCP tool names**

Run: `/mcp` in Claude Code and note the actual `mcp__pencil__*` tool names available (e.g. list/open document, get frame/component, export). Use the real names in the frontmatter — do not invent them.

- [ ] **Step 2: Write the agent file** (fill the Pencil tool names discovered in Step 1)

```markdown
---
name: design-conformance
description: Report-only comparison of a rendered web UI against its Pencil design source — spacing, type scale, colour tokens, component structure. Returns structured deviation findings, never edits code or design.
tools: Read, <mcp__pencil__* tools from /mcp>, mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot
---

You are a design-conformance specialist. Brief: `{ baseUrl, routes, pencilDesignFile, storageStatePath }`.

Method, per route that maps to a design frame:
1. Open the relevant frame/artboard in `pencilDesignFile` via the Pencil MCP; extract intent: spacing/rhythm, type scale, colour tokens, component structure & hierarchy.
2. Capture (or reuse) a rendered screenshot of the route; Read it back.
3. Compare intent vs rendered. Report DEVIATIONS only — you are not scoring a pixel-diff (no baseline system in phase 1).

Report each deviation as intent → rendered → gap. Prefer token-level observations ("uses 12px gap, design specifies 16px / --space-4") over vague "looks off".

Do NOT edit code or the design. Do NOT judge runtime behaviour.

Return ONLY this JSON:
{ "agent": "design-conformance", "results": [ { "route": "...", "frame": "...", "verdict": "pass|warn|fail",
  "findings": [ { "severity": "high|medium|low", "title": "...", "intent": "...", "rendered": "...",
  "gap": "...", "suggested_owner": "coder|design" } ] } ] }
```

- [ ] **Step 3: Validate the frontmatter loads**

Run: `head -6 ".claude/agents/design-conformance.md"`
Expected: valid frontmatter; Pencil tool names are real (present in `/mcp` output), not invented.

- [ ] **Step 4: Commit**

```bash
git add ".claude/agents/design-conformance.md"
git commit -m "feat(design-loop): design-conformance agent (Pencil MCP + screenshot, report-only)"
```

---

## Task 7: `/design-loop` orchestration skill + report template

**Files:**
- Create: `agents & workflows/.claude/skills/design-loop/SKILL.md`
- Create: `agents & workflows/tools/design-loop/report-template.md`

**Interfaces:**
- Consumes: `validateDesignLoopConfig` (Task 2), the three agents (Tasks 4–6).
- Produces: a skill that writes `./design-loop-reports/<date>-<slug>.md`.

- [ ] **Step 1: Write the report template**

```markdown
# Design Loop Report — {{LABEL}} — {{DATE}}

**App:** {{BASE_URL}} · **Routes:** {{ROUTE_COUNT}} · **Overall:** {{OVERALL_VERDICT}}

## Summary
| Route | Visual | Runtime | Conformance |
|---|---|---|---|
{{SUMMARY_ROWS}}

## Blockers & High findings
{{HIGH_FINDINGS}}

## Runtime performance
{{PERF_TABLE}}

## All findings (by route)
{{ALL_FINDINGS}}

## Screenshots
{{SCREENSHOT_REFS}}

---
_Report-only. No code or design was modified. You decide what to act on._
```

- [ ] **Step 2: Write the skill**

```markdown
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
```

- [ ] **Step 3: Dry-run the skill wiring on a fixture (no live app needed)**

Create a fixture config with `authMode: none` and one route; run the skill far enough to confirm: config validation passes, it attempts to dispatch three agents, and it fails gracefully with a clear message when the MCP servers aren't enabled. (Full live run happens in Task 9.)

Expected: clear "servers not connected — run setup.js + /mcp" message, no crash, no edits.

- [ ] **Step 4: Commit**

```bash
git add ".claude/skills/design-loop/SKILL.md" "tools/design-loop/report-template.md"
git commit -m "feat(design-loop): /design-loop orchestration skill + consolidated report template"
```

---

## Task 8: Consolidate existing assets + global install + memory note

**Files:**
- Modify: `agents & workflows/.claude/agents/design-reviewer.md` (→ deprecation pointer)
- Modify: `agents & workflows/README.md`
- Modify: `agents & workflows/quick-reference.md`

**Interfaces:**
- Consumes: everything above. No new runtime interface.

- [ ] **Step 1: Migrate anything unique from the old `design-reviewer.md`**

Read `agents & workflows/.claude/agents/design-reviewer.md` and Guide Connect's `design-review` agent + `frontend-verify` skill. Fold any unique, still-valid guidance (e.g. WCAG triage matrix, viewport list) into the new `visual-reviewer.md` / `design-conformance.md`. List what you migrated in the commit body.

- [ ] **Step 2: Convert `design-reviewer.md` to a pointer**

Replace its body with a short deprecation note directing readers to the `design-loop` skill + the three specialists. Keep the file so old references resolve.

- [ ] **Step 3: Update README + quick-reference**

Add a "Design Loop" section to `README.md` (what it is, the three agents, the `/design-loop` skill, how to onboard a project: write `.claude/design-loop.json` → run `setup.js` → `/mcp` → `/design-loop`). Add a one-line `/design-loop` row to `quick-reference.md`.

- [ ] **Step 4: Install globally**

Run:
```bash
cp ".claude/agents/visual-reviewer.md" ".claude/agents/runtime-diagnostician.md" ".claude/agents/design-conformance.md" ~/.claude/agents/
mkdir -p ~/.claude/skills/design-loop && cp ".claude/skills/design-loop/SKILL.md" ~/.claude/skills/design-loop/
ls ~/.claude/agents/ | grep -E 'visual-reviewer|runtime-diagnostician|design-conformance'
```
Expected: the three agent files listed under `~/.claude/agents/`.

- [ ] **Step 5: Write the project-memory note**

In the data-platform memory dir, add a memory (type: reference) pointing to this library + the `/design-loop` onboarding steps, and update `MEMORY.md`. This is how other projects discover it.

- [ ] **Step 6: Commit**

```bash
git add "README.md" "quick-reference.md" ".claude/agents/design-reviewer.md"
git commit -m "docs(design-loop): consolidate design-reviewer into the trio; onboard docs + global install"
```

---

## Task 9: Prove-it-first — live run against data-platform Allocation Surface

**Files:**
- Create (in data-platform): `.claude/design-loop.json`

**Interfaces:**
- Consumes: the whole system. Produces a real report — the acceptance test.

- [ ] **Step 1: Write data-platform's config**

Create `/Users/ingimareyfjord/Projects/Work/DialogueOne/data-platform/.claude/design-loop.json`:
```json
{
  "baseUrl": "http://localhost:8000",
  "authMode": "storage-state",
  "sessionMintCmd": "docker compose exec -T django python manage.py shell < scripts/mint_review_session.py",
  "pencilDesignFile": "<path to the Allocation Surface .pen once the Windows redesign lands>",
  "viewports": ["1440x900", "1280x800"],
  "routes": [
    { "path": "/admin/assignment/allocationsurface/", "label": "Allocation Surface", "waitFor": ".as-matrix" }
  ]
}
```

- [ ] **Step 2: Run setup + enable servers**

Run (from the data-platform repo root, with the local stack up):
```bash
node "/Users/ingimareyfjord/Projects/homepage/agents & workflows/tools/design-loop/setup.js"
```
Then `/mcp` → approve `playwright` + `chrome-devtools`.
Expected: `.mcp.json` (macOS `npx`, pinned) + `.claude/playwright-mcp.config.json` written; servers connect.

- [ ] **Step 3: Run the loop**

Invoke `/design-loop`. Expected: a report at `data-platform/design-loop-reports/<date>-allocation-surface.md` with a summary table, any console/network/perf findings from the Allocation Surface, screenshots, and per-route verdicts — and NO edits to any file.

- [ ] **Step 4: Validate the report is real, not hollow**

Read the report. Confirm each of the three agents contributed a section, the perf numbers are populated, and at least the known-good route renders. Cross-check one finding by hand (open the route in a browser).

- [ ] **Step 5: Commit the data-platform config** (only when the user approves committing there — the tree is on hold)

```bash
# In data-platform, on a branch, only when the user says so:
git add .claude/design-loop.json
git commit -m "chore(design-loop): onboard data-platform Allocation Surface to /design-loop"
```

---

## Self-Review (completed by author)

- **Spec coverage:** D1 portable → Tasks 1/3 (OS branch, host-agnostic config); D2 three specialists → Tasks 4/5/6; D3 report-only → enforced in every agent + skill + Global Constraints; D4 packaging → Task 8 (global install + staged here + memory note); D5 bootstrap + pinning → Tasks 1/3; D6 consolidation → Task 8. Entry skill → Task 7. Auth/storage-state → Task 7 step 3. Prove-it-first → Task 9. All spec §sections mapped.
- **Placeholder scan:** Version pins (`0.0.41`/`0.6.0`) are illustrative in tests; `setup.js` resolves real versions via `npm view` at run time (Task 3) — not a placeholder, a deliberate runtime resolution. `pencilDesignFile` path and Pencil MCP tool names are explicitly deferred to discovery steps (Task 6 step 1, Task 9) rather than invented — honest, not hollow.
- **Type consistency:** `buildMcpConfig(platform, pins)` and `validateDesignLoopConfig(obj)` names match between definition and consumption (setup.js, skill). The findings JSON shape is consistent across all three agents and the report merge.
- **Known deferral:** exact MCP tool names for Pencil are discovered at implementation time (Task 6 step 1); Playwright/Chrome DevTools tool names used are from the current official tool references.
