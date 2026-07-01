---
name: design-reviewer
description: Use this agent for comprehensive design review on UI changes. Verifies visual consistency, accessibility, and user experience quality. Requires Playwright MCP for live testing. Example - "Review the design changes in the new dashboard"
model: sonnet
color: pink
tools: Read, Write, Edit, Glob, Grep, Bash
---

> **This agent is superseded.** Use the `/design-loop` skill instead.

The `/design-loop` skill fans out to three specialist agents that collectively cover everything this agent did — and more:

| Specialist | Covers |
|---|---|
| `visual-reviewer` | Layout, responsive, contrast, empty/error states, WCAG 2.1 AA |
| `runtime-diagnostician` | Console errors, network failures, performance (LCP/CLS/INP) |
| `design-conformance` | Pencil design intent vs rendered output, token/spacing deviations, code health |

**To onboard a project to `/design-loop`:**
1. Write `.claude/design-loop.json` (see `tools/design-loop/design-loop.schema.json` for the shape).
2. Run `node <lib>/tools/design-loop/setup.js` from the project root (pins MCP versions, writes `.mcp.json`).
3. Run `/mcp` in Claude Code and approve `playwright` + `chrome-devtools`.
4. Invoke `/design-loop`.

Library lives at: `~/Projects/homepage/agents & workflows/`

This file is kept so that old references (agent chains, README links) resolve. Do not invoke it directly.
