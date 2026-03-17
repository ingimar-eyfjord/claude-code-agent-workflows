# CLAUDE.md

> Template project instructions. Customize for your project.

## Project Overview

<!-- Describe your project in 1-2 sentences -->

## Workflow Entry Points

Start work with the appropriate workflow skill:

| Skill | Purpose | Agents Required |
|-------|---------|-----------------|
| `/dev` | Full feature development | Yes |
| `/fix` | Complex bug fixes (needs investigation) | Yes |
| `/refactor` | Code cleanup, tech debt | Yes |
| `/quick-fix` | Direct fixes (bugs, small refactors, up to 2 files) | No (optional) |
| `/auto-dev` | Autonomous loop — picks `auto-ok` tasks, implements, commits (no push) | No |
| `/code-review` | Code review with severity classification | No (optional) |
| `/docs` | Documentation only | No |
| `/explore` | Research only (no implementation) | No |
| `/pre-push` | Pre-push: build, lint, test, fix | No |

---

## Architecture

<!-- Describe your bounded contexts / modules -->

| Module | Path | Key Models |
|--------|------|------------|
| <!-- Auth --> | <!-- /backend/auth/ --> | <!-- User, Token --> |
| <!-- Orders --> | <!-- /backend/orders/ --> | <!-- Order, OrderItem --> |

---

## Code Map

**Backend:** `/backend/`
<!-- - models, services, selectors, API per module -->

**Frontend:** `/frontend/`
<!-- - pages, components, API clients, types -->

---

## Context Documents

Read the relevant context document before implementing:

| Document | Module | Content |
|----------|--------|---------|
| `.claude/contexts/example-context.md` | Example | Models, services, APIs, gotchas |

<!-- Add your context documents here -->

---

## Agent Chains

| Work Type | Agent Chain |
|-----------|-------------|
| Backend | `arch-planner` -> `backend-engineer` -> `test-engineer` -> `api-contract-guardian` |
| Frontend | `frontend-engineer` -> `test-engineer` -> `api-contract-guardian` -> `design-reviewer` |
| Full-stack | `arch-planner` -> `backend-engineer` -> `frontend-engineer` -> `test-engineer` |
| Infrastructure | `infra-ops` -> `arch-planner` |

---

## Operating Rules

1. **Read context documents** before implementing in any bounded context
2. **Use `/quick-fix`** for clear, scoped fixes — don't over-engineer the workflow
3. **Agents implement, Claude orchestrates** — after plan mode, invoke agents via Task tool
4. **No direct commits** — prepare diffs, humans decide on commits/PRs
5. **Test your changes** — agents should run relevant tests before completing

---

## API Patterns

<!-- Document your API conventions -->

| Correct | Wrong |
|---------|-------|
| <!-- `/orders/` --> | <!-- `/api/orders/` --> |

---

## Build & Test

```bash
# Backend tests
<!-- pytest backend/ -->

# Frontend build
<!-- npm run build -->

# Lint
<!-- npm run lint -->
```
