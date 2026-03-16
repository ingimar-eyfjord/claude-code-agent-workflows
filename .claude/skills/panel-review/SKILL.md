---
name: panel-review
description: Code review with Panel Todo tracking. Creates sprint + fix tickets, chains into /panel-fix.
---

# /panel-review - Code Review + Panel Todo Sprint

**Purpose**: Thorough code review that produces actionable Panel Todo tickets. Designed to pair with `/panel-fix` for a fast review-then-fix loop.

**Key Characteristics**:
- Read-only analysis (no code edits)
- Creates Panel Todo sprint + tickets for findings
- Optionally invokes `code-reviewer` agent for deep analysis
- Chains into `/panel-fix` for the fix phase

---

## When to Use /panel-review

**Appropriate for**:
- Post-implementation code review of a feature or module
- Reviewing a set of changed files after `/dev` or `/batch-dev`
- Periodic quality audits of a module
- Pre-merge review of a feature branch

**NOT appropriate for**:
- Architecture-level analysis (use `/architect-review`)
- Quick one-off review without tracking (use `/code-review`)

---

## Workflow Steps

### Step 1: DETERMINE SCOPE

Accept scope from user (feature area, file list, module, or git diff).

### Step 2: CREATE PANEL TODO SPRINT

```
panelTodo_createSprint(name="Review: [scope]", goal="Code review findings for [scope]")
```

### Step 3: READ AND ANALYZE

Read all relevant files. Focus on:
- Race conditions and concurrency issues
- Validation gaps and missing boundary checks
- Error handling (swallowed exceptions, silent failures)
- Logic bugs (incorrect state transitions, off-by-one)
- Security (injection, permission checks, data exposure)
- Test coverage gaps

**Optionally invoke `code-reviewer` agent** for complex modules.

### Step 4: CREATE TICKETS

For each finding, create a Panel Todo issue with:
- Clear, specific title
- Severity classification (critical / high / medium / low)
- File and line numbers
- Problem explanation
- Concrete fix suggestion

```
panelTodo_batchCreateIssues(
  sprintId="...",
  issues=[
    { title: "Race condition: update_stock TOCTOU", description: "...", priority: "high" },
    { title: "Missing null check on user.email", description: "...", priority: "medium" },
    ...
  ]
)
```

### Step 5: REPORT SUMMARY

```markdown
## Code Review: [scope]

| Ticket | Severity | Issue |
|--------|----------|-------|
| PT-xxx | HIGH     | Race condition in stock update |
| PT-xxx | MEDIUM   | Missing null check |

### Next Steps
Run `/panel-fix PT-xxx` to work through each ticket.
```

---

## Severity Classification

| Severity | Criteria | Priority |
|----------|----------|----------|
| CRITICAL | Data loss, security vulnerability, production crash | critical |
| HIGH | Race condition, logic bug, incorrect behavior | high |
| MEDIUM | Missing validation, poor error handling | medium |
| LOW | Style, naming, minor UX issues | low |

---

## Chaining with /panel-fix

```
/panel-review "payment module"    --> Creates PT-1 through PT-6
/panel-fix PT-1                   --> Fix race condition
/panel-fix PT-2                   --> Fix validation gap
/panel-fix PT-3                   --> Fix null check
...
```

Each `/panel-fix` invocation loads the ticket, implements the fix, and marks it done.

---

## Enforcement

- Code edits BLOCKED (read-only analysis)
- Panel Todo required for ticket creation
