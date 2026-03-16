---
name: fix
description: Bug fix workflow. MANDATORY agent invocation. For complex bugs needing investigation.
---

# /fix - Bug Fix Workflow

**Purpose**: Streamlined workflow for bugs that need investigation. Requires agent-based implementation.

**CRITICAL**: This workflow REQUIRES agent-based implementation. Claude MUST NOT implement directly except for triage investigation.

---

## Workflow Steps

### Step 1: TRIAGE + PREFLIGHT (Claude can do directly)

Investigate the bug:
1. Read relevant files
2. Search for related code
3. Analyze error messages
4. Identify affected files
5. Assess severity

**Output**: Root cause identified, affected files listed, fix approach determined.

**NOTE**: This is the ONLY step where Claude can use Read/Search tools directly.

### Step 2: CONTEXT LOADING (MANDATORY)

Read the relevant bounded context document from `.claude/contexts/`.

### Step 3: INVOKE AGENTS (REQUIRED)

| Bug Location | Agent Chain |
|--------------|-------------|
| Backend | `backend-engineer` -> `test-engineer` |
| Frontend | `frontend-engineer` -> `test-engineer` |
| API Contract | `api-contract-guardian` -> `backend-engineer` or `frontend-engineer` |
| Infrastructure | `infra-ops` |

### Step 4: VERIFY (REQUIRED)

1. Agent runs tests
2. Confirm bug is resolved
3. Check for regressions

### Step 5: COMPLETE TRACKING (IF USED)

Update task tracker if one was loaded.

---

## Severity Classification

| Severity | Criteria | Response |
|----------|----------|----------|
| CRITICAL | System down, data loss, security | Fix immediately |
| MAJOR | Core feature broken, significant impact | Fix in current sprint |
| MINOR | Non-core, workaround exists | Schedule for later |
| TRIVIAL | Cosmetic, typo | Consider /quick-fix instead |

---

## When to Use /fix vs /quick-fix

| Use /fix | Use /quick-fix |
|----------|---------------|
| Root cause unclear | You know exactly what's wrong |
| Multiple files affected (3+) | 1-2 files |
| Requires investigation | Obvious fix |
| Needs regression tests | Simple verification |
| Security-related | No security implications |
