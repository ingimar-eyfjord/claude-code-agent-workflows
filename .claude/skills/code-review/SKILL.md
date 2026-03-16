---
name: code-review
description: Code review workflow. Read-only analysis with severity classification. Creates actionable findings.
---

# /code-review - Code Review Workflow

**Purpose**: Systematic code review with severity classification. Read-only — does not implement fixes.

**Key Characteristics**:
- Read-only analysis (no code changes)
- Optional agent: `code-reviewer` for thorough analysis
- Creates actionable findings with file:line references
- Chains into `/quick-fix` or `/fix` for implementing fixes

---

## Workflow Steps

### Step 1: DETERMINE SCOPE

What to review:
- Specific files or directories
- A git diff range (`git diff main..HEAD`)
- A feature area or module
- Recent changes

### Step 2: ANALYZE

Focus on:
- Race conditions and concurrency issues
- Validation gaps and missing null checks
- Error handling (swallowed exceptions, missing catches)
- Logic bugs and off-by-one errors
- Security vulnerabilities
- Performance issues (N+1 queries, unnecessary re-renders)
- Test coverage gaps

### Step 3: CLASSIFY FINDINGS

| Severity | Description |
|----------|-------------|
| CRITICAL | Data loss, security vulnerability, system crash |
| HIGH | Race condition, logic bug, missing validation |
| MEDIUM | Poor error handling, missing tests |
| LOW | Style, naming, minor UX issues |

### Step 4: REPORT

For each finding:
- File and line number
- Problem description
- Concrete fix suggestion
- Severity classification

---

## Example Output

```markdown
## Code Review: marketplace/services.py

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | HIGH | Race condition in stock update | services.py:145 |
| 2 | MEDIUM | Missing null check on user.email | services.py:89 |
| 3 | LOW | Function name unclear | services.py:200 |

### Details

**1. [HIGH] Race condition in stock update**
Location: `services.py:145`
Problem: `update_stock()` reads and writes without a lock — concurrent requests can oversell.
Fix: Wrap in `select_for_update()` or use F() expression.
```

---

## After Review

Fix findings using the appropriate workflow:
- Simple fixes -> `/quick-fix`
- Complex fixes -> `/fix`
- Structural issues -> `/refactor`
