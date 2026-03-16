---
name: dev
description: Full feature development workflow. MANDATORY agent invocation. Task tracking optional.
---

# /dev - Full Development Workflow

**Purpose**: The main development workflow for features and stories. Ensures proper planning and agent-based implementation.

**CRITICAL**: This workflow REQUIRES agent invocation. Claude MUST NOT implement directly.

---

## Workflow Steps

### Step 1: CONTEXT (OPTIONAL)

Load task tracking if available (Jira, Linear, GitHub Issues, or any project tracker).

### Step 2: PREFLIGHT CHECK (MANDATORY)

**ALWAYS check existing code before planning.**

1. Search for existing models/classes matching the feature
2. Search for existing API endpoints
3. Search for existing frontend components
4. Check for similar/duplicate work

| Preflight Result | Action |
|------------------|--------|
| Feature exists fully | STOP — inform user |
| Partial implementation | MODIFY SCOPE — plan only missing parts |
| No existing code | PROCEED |

### Step 3: CONTEXT LOADING (MANDATORY)

Read the relevant bounded context document from `.claude/contexts/` before planning.

### Step 4: PLAN MODE (REQUIRED)

Enter plan mode and document the approach:
- Files to create/modify
- Agent chain to invoke
- Test strategy
- What existing code to reuse (from preflight)

### Step 5: INVOKE AGENTS (REQUIRED — NEVER SKIP)

**Agent Chains by Work Type**:

| Work Type | Agent Chain |
|-----------|-------------|
| Backend | `arch-planner` -> `backend-engineer` -> `test-engineer` -> `api-contract-guardian` |
| Frontend | `frontend-engineer` -> `test-engineer` -> `api-contract-guardian` -> `design-reviewer` |
| Full-stack | `arch-planner` -> `backend-engineer` -> `frontend-engineer` -> `test-engineer` |
| Infrastructure | `infra-ops` -> `arch-planner` |

**VIOLATION**: Using Edit, Write, or direct code changes instead of invoking agents.

### Step 6: COMPLETE TRACKING (IF USED)

Update whatever task tracker was loaded.

---

## What Claude MUST Do

1. Run preflight check (search existing code first)
2. Read the relevant context document
3. Use plan mode for design
4. Invoke agents via Task tool
5. If tracker was used, update it on completion

## What Claude MUST NOT Do

1. Implement code directly (use agents)
2. Skip preflight check
3. Skip reading the context document
4. Exit plan mode without invoking agents
