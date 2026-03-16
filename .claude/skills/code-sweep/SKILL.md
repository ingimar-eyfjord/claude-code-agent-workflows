---
name: code-sweep
description: Review + fix structural code quality. Tickets behavioral issues for follow-up.
---

# /code-sweep - Code Review + Fix Workflow

**Purpose**: Review code AND fix structural issues in one pass. Eliminates tedious review-then-fix-one-at-a-time loops.

**Agent chain**: `code-reviewer` → `code-refactorer`

**Key Characteristics**:
- Both agents REQUIRED
- Structural issues get FIXED by `code-refactorer`
- Behavioral issues get TICKETED for follow-up
- Tests must pass after refactoring
- NO direct code edits (go through `code-refactorer`)

---

## When to Use /code-sweep

**Appropriate for**:
- Post-feature code quality pass
- Periodic cleanup of a module
- Reducing complexity before adding new features
- Cleaning up code written by agents or automated tools

**NOT appropriate for**:
- Fixing specific bugs (use `/fix` or `/quick-fix`)
- Read-only review without fixes (use `/code-review`)
- Full feature refactoring with behavioral changes (use `/refactor`)

---

## The Golden Rule: STRUCTURAL vs BEHAVIORAL

| Fixed by code-refactorer (HOW) | Ticketed for follow-up (WHAT) |
|--------------------------------|-------------------------------|
| Code duplication (>10 lines) | Logic bugs |
| Long functions (>50 lines) | Missing validations |
| High cyclomatic complexity (CC >10) | Security vulnerabilities |
| Poor naming, dead code | Race conditions |
| Style violations | Missing error handling |
| Unused imports/variables | Incorrect state transitions |
| Deep nesting (>3 levels) | Data integrity issues |
| God classes/functions | Missing permission checks |

**Structural** = changes HOW code is organized, without changing WHAT it does.
**Behavioral** = changes WHAT the code does or adds new behavior.

---

## Workflow Steps

### Step 1: DETERMINE SCOPE

Accept scope from user. Scope can be:
- A module or directory
- A feature area
- A file list
- A git diff range

### Step 2: LOAD CONTEXT (MANDATORY)

Read relevant context document from `.claude/contexts/` before reviewing.

### Step 3: INVOKE code-reviewer (REQUIRED)

Invoke the `code-reviewer` agent with:
- Scope (files/module to review)
- Instruction to classify each finding as **STRUCTURAL** or **BEHAVIORAL**

### Step 4: TRIAGE — PRESENT TO USER (MANDATORY)

Present the triage. **Wait for approval before proceeding.**

```markdown
## Code Sweep Triage: [scope]

### Will Fix (structural — code-refactorer)
| # | Issue | Location | What Changes |
|---|-------|----------|-------------|
| 1 | Extract duplicated logic | services.py:45,89 | New helper, same behavior |

### Will Ticket (behavioral — for follow-up)
| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | HIGH | Missing permission check | views.py:67 |

Proceed with fixes? (y/n)
```

### Step 5: INVOKE code-refactorer (REQUIRED)

After user approves, invoke the `code-refactorer` agent with the approved structural fixes.

### Step 6: CREATE TICKETS (IF BEHAVIORAL ISSUES FOUND)

Create tickets in your project's task tracker for behavioral issues.

### Step 7: VERIFY TESTS PASS (MANDATORY)

Run tests to confirm structural changes didn't break behavior. If tests fail, have `code-refactorer` fix or revert the change.

### Step 8: REPORT SUMMARY

Present final summary with metrics (files reviewed, issues fixed, issues ticketed, test status).

---

## Enforcement

**This workflow**:
- Both `code-reviewer` and `code-refactorer` agents REQUIRED
- Direct code edits BLOCKED (go through `code-refactorer` agent)
- Tests must pass after refactoring
