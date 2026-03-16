---
name: refactor
description: Code cleanup workflow. MANDATORY agent invocation. For technical debt and code improvement.
---

# /refactor - Code Cleanup Workflow

**Purpose**: Improve code quality without changing behavior. For technical debt, cleanup, and maintainability improvements.

**CRITICAL**: This workflow REQUIRES agent-based implementation. Behavior MUST NOT change.

---

## Workflow Steps

### Step 1: REVIEW CURRENT STATE

1. Read affected files
2. Identify code smells (long functions, duplication, tight coupling)
3. Check how similar code is structured elsewhere
4. Document current behavior (to preserve)

### Step 2: CONTEXT LOADING (MANDATORY)

Read the relevant bounded context document from `.claude/contexts/`.

### Step 3: INVOKE AGENTS (REQUIRED)

| Step | Agent | Purpose |
|------|-------|---------|
| 1 | `code-reviewer` | Analyze current code, identify issues |
| 2 | `code-refactorer` | Implement improvements |
| 3 | `test-engineer` | Verify behavior preserved |

### Step 4: VERIFY (REQUIRED)

1. All existing tests pass
2. No new failures introduced
3. Code coverage maintained or improved
4. Performance not degraded

---

## Golden Rule

**Refactoring changes HOW code works, not WHAT it does.**

If you need to change behavior:
- Use /dev for new features
- Use /fix for bug fixes
- /refactor is structure-only
