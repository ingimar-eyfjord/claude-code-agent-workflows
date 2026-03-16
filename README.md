# Claude Code Agents & Workflows

A production-tested system of specialized agents, workflow skills, and enforcement hooks for Claude Code. Battle-tested on a real B2B SaaS product with 18 agents and 16 workflows.

## Philosophy

Based on [Anthropic's agent-building guidance](https://docs.anthropic.com/en/docs/build-with-claude/agentic-tool-use):

1. **Start simple** — Use `/quick-fix` for most things. Only escalate to agent pipelines when complexity demands it.
2. **Specialized agents > one generalist** — Each agent optimizes for its domain with fresh context.
3. **Context documents > context agents** — Rich markdown files are faster and cheaper than read-only agents.
4. **Two-tier tracking** — High-level stories for stakeholders, code-level tasks for Claude sessions.
5. **Enforce with hooks** — Workflows without enforcement are just suggestions.

## What's Included

```
.claude/
  agents/           # 10 specialized agents (architect, backend, frontend, etc.)
  skills/           # 16 workflow skills (see Workflow Ladder below)
  contexts/         # Context document pattern (README + template)
CLAUDE.md           # Template project instructions
quick-reference.md  # Cheat sheet for workflow selection
```

## Quick Start

1. Copy the `.claude/` directory into your project root
2. Copy `CLAUDE.md` to your project root and customize it
3. Adapt agent definitions to your stack (the defaults assume Python + TypeScript)
4. Create context documents for your bounded contexts / modules
5. Set up MCP servers for the tools you want to use (see MCP Servers below)

---

## Workflow Ladder

From lightest to heaviest:

| Workflow | Scope | Direct Edits | Agents | When to Use |
|----------|-------|:------------:|:------:|-------------|
| `/quick-fix` | 1-2 files | Yes | Optional | "Fix this bug", small refactors |
| `/docs` | .md only | .md only | No | Documentation changes |
| `/explore` | Read-only | No | No | Research, investigation |
| `/preflight-check` | Read-only | No | No | Check if feature exists before building |
| `/code-review` | Read-only | No | Optional | Quick code review without tracking |
| `/panel-review` | Read-only | No | Optional | Code review with Panel Todo ticket creation |
| `/panel-fix` | Multi-file | Yes | Optional | Fix Panel Todo tickets from reviews |
| `/feature-design` | Read-only | No | Required | Feature vetting + architecture design |
| `/code-sweep` | Any | Structural only | Required | Review + fix quality in one pass |
| `/refactor` | Any | No | Required | Code cleanup, tech debt |
| `/fix` | Any | No | Required | Complex bugs needing investigation |
| `/dev` | Any | No | Required | Features, stories |
| `/batch-dev` | Any | No | Required | Parallel multi-session development |
| `/sprint-planning` | Read-only | No | Design only | Sprint prep (stories + execution tasks) |
| `/architect-review` | Read-only | No | Analysis only | Architecture analysis via Axon |
| `/pre-push` | Any | Yes | No | Pre-push validation |

**The key insight**: Most work is `/quick-fix`. Reserve agent pipelines for genuinely complex work.

---

## Two-Tier Task Tracking

This is the pattern that changed how we work with Claude Code.

### The Problem

Ticket trackers (Jira, Linear, GitHub Issues) are designed for humans and stakeholders. They track what the project needs: "Build tour sharing feature", "Fix checkout bug". But Claude sessions need something different — they need to know what the *code* needs: "Add sharing_token field", "Create POST /share endpoint", "Write ShareButton component".

Mixing these creates noise in both directions. Stakeholders don't want to see 15 implementation subtasks. Claude sessions don't want to parse acceptance criteria meant for humans.

### The Solution: Two Tiers

```
TIER 1: Your Ticket Tracker (Jira, Linear, GitHub Issues)
═══════════════════════════════════════════════════════════
  Stakeholder-visible
  Epics, stories, acceptance criteria
  "Build tour sharing feature" (PROJ-100)

        ↓ /sprint-planning bridges the gap ↓

TIER 2: Panel Todo (MCP server for Claude Code)
═══════════════════════════════════════════════════════════
  Developer/Claude-visible
  Code-level tasks with dependencies
  "Add sharing_token field" (PT-1)
  "Create POST /share endpoint" (PT-2, blocked_by: PT-1)
  "Write ShareButton component" (PT-3, blocked_by: PT-2)
```

### How It Flows

1. **`/sprint-planning`** — Create stories in your ticket tracker, then bridge to Panel Todo:
   - One story → 2-5 code-level tasks
   - Include ticket key in task description for traceability
   - Set `blocked_by` for dependency ordering

2. **`/batch-dev`** — Multiple Claude sessions work the Panel Todo sprint:
   - Each session queries for unassigned, unblocked tasks
   - Claims a task (sets `assignee`)
   - Invokes the appropriate agent
   - Completes the task → unblocks downstream tasks

3. **`/panel-review`** → **`/panel-fix`** — Code review loop:
   - Review creates Panel Todo sprint with fix tickets
   - Each `/panel-fix` loads a ticket, implements the fix, marks done

### Panel Todo Fields

| Field | Purpose |
|-------|---------|
| `title` | Code-level task description |
| `description` | Scope, affected files, ticket tracker reference |
| `priority` | critical / high / medium / low |
| `tags` | Track grouping (track-backend, track-frontend) |
| `blocked_by` | Dependency on other tasks |
| `assignee` | Which Claude session claimed this |
| `isBlocked` | Computed: true if any `blocked_by` is incomplete |

**Panel Todo** is a local MCP server — [github.com/ingimareyfjord/panel-todo](https://github.com/ingimareyfjord/panel-todo). Works with any Claude Code project.

---

## Architecture Analysis with Axon

For projects with complex module boundaries, the `/architect-review` workflow uses the [Axon](https://github.com/QuantGeekDev/axon) codebase knowledge graph to answer questions that grep can't:

- **Blast radius**: "If I change this model, what breaks?"
- **Cross-module dependencies**: "Which modules import from each other?"
- **Dead code detection**: "What's unused after this refactor?"
- **Fan-in hotspots**: "What are the most depended-on symbols?"

### Two Modes

| Mode | When | What It Does |
|------|------|--------------|
| **Design** | Before dev | Blast radius, dependency mapping, story ordering, risk assessment |
| **Review** | After dev | Side effect detection, dead code delta, boundary violation check |

### Example Flow

```
/architect-review design        <- "If we add sharing to tours, what's affected?"
    |                              Axon finds: Tour, TourSerializer, tour_list.tsx, 3 test files
    |                              Risk: Medium (2 cross-module imports)
    |                              Recommended order: model -> API -> frontend -> tests
    |
/sprint-planning                <- organize findings into sprint
    |
/dev (implement stories)
    |
/architect-review review        <- "Did we break anything? New dead code?"
    |                              Verdict: PASS WITH NOTES (1 unused import)
    |
/pre-push                       <- build, lint, test, push
```

---

## Common Development Flows

### Full Feature Pipeline (new ideas)

```
/feature-design "tour sharing"      <- should we build? how?
        |
/sprint-planning                    <- stories + Panel Todo tasks
        |
/batch-dev                          <- parallel sessions implement
        |
/code-sweep "sharing module"        <- fix structural quality
        |
/pre-push                           <- validate and push
```

### Architecture-First Pipeline

```
/architect-review design            <- blast radius + story ordering
        |
/dev or /batch-dev                  <- implement
        |
/architect-review review            <- verify no side effects
        |
/pre-push
```

### Code Quality Pipeline

```
/panel-review "payment module"      <- creates fix tickets
        |
/panel-fix PT-1                     <- fix each ticket
/panel-fix PT-2
/panel-fix PT-3
        |
/pre-push
```

### Quick Iteration

```
/dev -> /pre-push -> push
```

### Bug Hotfix

```
/quick-fix (clear, 1-2 files) -> /pre-push -> push
/fix (complex, needs investigation) -> /pre-push -> push
```

---

## Agent Roster (10 agents)

| Agent | Model | Role |
|-------|-------|------|
| `arch-planner` | opus | Architecture design, ADRs, API contracts |
| `backend-engineer` | opus | Backend implementation (models, services, APIs) |
| `frontend-engineer` | opus | Frontend implementation (components, pages, state) |
| `test-engineer` | opus | Test automation (unit, integration, E2E) |
| `code-reviewer` | sonnet | Code review with severity classification |
| `code-refactorer` | sonnet | Code cleanup, complexity reduction |
| `api-contract-guardian` | haiku | API contract verification (backend <-> frontend types) |
| `security-reviewer` | opus | Security audit, OWASP, data protection |
| `infra-ops` | opus | Docker, CI/CD, deployment |
| `design-reviewer` | sonnet | UI/UX review, accessibility, responsiveness |

### Model Tiering Strategy

- **opus** — Complex decision-making: architecture, implementation, testing
- **sonnet** — Balanced quality/speed: reviews, refactoring
- **haiku** — Fast/cheap: contract checks, lightweight validation

## Agent Chains

| Work Type | Chain |
|-----------|-------|
| Backend feature | `arch-planner` -> `backend-engineer` -> `test-engineer` -> `api-contract-guardian` |
| Frontend feature | `frontend-engineer` -> `test-engineer` -> `api-contract-guardian` -> `design-reviewer` |
| Full-stack | `arch-planner` -> `backend-engineer` -> `frontend-engineer` -> `test-engineer` |
| Bug fix | `backend-engineer` or `frontend-engineer` -> `test-engineer` |
| Feature Design | `product-strategy-advisor` -> `arch-planner` |
| Code Sweep | `code-reviewer` -> `code-refactorer` |
| Code cleanup | `code-reviewer` -> `code-refactorer` -> `test-engineer` |
| Architecture | `arch-planner` + `architecture-tester` + `product-strategy-advisor` |
| Infrastructure | `infra-ops` -> `arch-planner` |

---

## MCP Servers Used

The workflow system integrates with these MCP servers:

| Server | Purpose | Used By |
|--------|---------|---------|
| **[Panel Todo](https://github.com/ingimareyfjord/panel-todo)** | Code-level task tracking with sprints, dependencies, and multi-session coordination | `/panel-review`, `/panel-fix`, `/batch-dev`, `/sprint-planning`, `/code-sweep` |
| **[Axon](https://github.com/QuantGeekDev/axon)** | Codebase knowledge graph (KuzuDB) for blast radius, dead code, cross-module analysis | `/architect-review` |
| **[mcp-atlassian](https://github.com/sooperset/mcp-atlassian)** | Jira + Confluence integration for stories, sprints, documentation | `/sprint-planning`, `/dev`, `/fix` |
| **[shadcn](https://github.com/nicholasgriffintn/shadcn-ui-mcp)** | UI component discovery and installation | `frontend-engineer` agent |
| **[Playwright](https://github.com/nicholasgriffintn/playwright-mcp)** | Browser automation for visual design review | `design-reviewer` agent |
| **[Context7](https://github.com/nicholasgriffintn/context7-mcp)** | Library documentation lookup | `/explore` |

All are optional — the workflow system degrades gracefully. Without Panel Todo, use `/code-review` instead of `/panel-review`. Without Axon, skip `/architect-review` and use `/feature-design` for pre-dev analysis. Without Jira, use Panel Todo alone for all tracking.

---

## Context Documents Pattern

Instead of read-only "expert" agents, use rich markdown files:

```
.claude/contexts/
  payments-context.md      # Models, services, API endpoints, gotchas
  auth-context.md          # Auth flow, token lifecycle, providers
  orders-context.md        # Order models, state machine, webhooks
```

Each context document contains:
- Key models with fields and relationships
- Service/selector file locations
- API endpoints
- Cross-module dependencies
- Common gotchas and traps

Agents read these documents before implementing. This is faster and cheaper than invoking a separate agent for domain knowledge.

---

## Customization Guide

### Adapting to Your Stack

The default agents assume Python (Django/FastAPI) + TypeScript (React/Next.js). To adapt:

1. **`backend-engineer.md`** — Change framework references (Django -> Rails, FastAPI, Express, etc.)
2. **`frontend-engineer.md`** — Change framework references (Next.js -> Vue, Svelte, etc.)
3. **Skills** — Update file patterns in enforcement rules (.py -> .rb, .go, etc.)
4. **Context documents** — Create for your bounded contexts / modules

### Adding Domain-Specific Agents

For complex domains (billing, compliance, ML), create specialized agents:

```yaml
---
name: billing-expert
description: Billing domain specialist. Invoke for subscription, payment, or invoicing work.
model: sonnet
tools: Read, Write, Edit, Glob, Grep, Bash
---

You are the billing domain specialist...
```

### Enforcement Hooks

The `hooks/` directory contains a workflow enforcement script. Configure in `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "type": "command",
        "command": "bash .claude/hooks/workflow-guard.sh"
      }
    ]
  }
}
```

---

## Design Decisions

### Why agents can't edit code directly in /dev and /fix

When Claude orchestrates agents, it writes the plan and the agents implement. If Claude also implemented, it would be both architect and builder — losing the benefit of fresh context and specialization.

### Why /quick-fix allows direct edits

For small, clear fixes, the overhead of spinning up an agent is worse than the benefit. A senior dev fixing a bug doesn't need a code review committee.

### Why two-tier tracking instead of just Jira or just Panel Todo

Jira is great for stakeholders but terrible for Claude session coordination. Panel Todo is great for code-level task claiming but has no stakeholder visibility. The bridge pattern (`/sprint-planning`) connects them: one Jira story becomes 2-5 Panel Todo tasks. Stakeholders see progress at the story level. Claude sessions see granular, dependency-ordered tasks at the code level.

### Why /feature-design before /dev

Most teams jump straight from "feature idea" to "implement it". `/feature-design` adds a strategic gate: does this feature make sense? What's the architecture? Two agents (`product-strategy-advisor` for strategy, `arch-planner` for architecture) answer these questions before any code gets written. If the recommendation is KILL, you save days of wasted work.

### Why /code-sweep instead of separate review + fix

The `/code-review` -> `/quick-fix` loop works but is tedious for quality passes: review finds 8 issues, you fix them one by one. `/code-sweep` collapses this by distinguishing structural issues (HOW code is organized — fixable by `code-refactorer` in bulk) from behavioral issues (WHAT code does — ticketed for careful individual fixes). One pass, two outcomes.

### Why Axon for architecture review

`grep` can find text. Axon can answer "if I change this model, what services, views, serializers, and tests need updating?" It builds a graph of your codebase's symbols and their relationships, enabling blast radius analysis that would take dozens of grep commands to approximate.

### Why context documents instead of expert agents

Read-only agents that can only answer questions are expensive documentation lookups. A markdown file:
- Loads instantly (no agent startup)
- Costs zero tokens for the agent invocation overhead
- Can be enriched with real dependency data (from tools like Axon)
- Is version-controlled and diffable

### Why model tiering

Not every agent needs opus. A contract check (comparing serializer fields to TypeScript types) is mechanical — haiku handles it perfectly at 1/10th the cost. Save opus for agents that need to make complex architectural decisions.

---

## Credits

Developed by [Ingimar Eyfjord](https://github.com/ingimareyfjord) while building [Guide Connect](https://guideconnect.is), refined through months of real production use with Claude Code.

Architecture patterns aligned with [Anthropic's Building Effective Agents](https://docs.anthropic.com/en/docs/build-with-claude/agentic-tool-use) guidance.
