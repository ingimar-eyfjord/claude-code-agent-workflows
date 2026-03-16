---
name: panel-fix
description: Fast code review fix workflow. Panel Todo tracking, direct implementation allowed. For iterative sprint fixes.
---

# /panel-fix - Code Review Fix Workflow

**Purpose**: Fast path for code review fixes tracked in Panel Todo. Designed for iterative sprint work where full agent overhead is unnecessary.

**Key Characteristics**:
- Panel Todo tracking (load issue, complete on finish)
- Direct implementation allowed (Edit/Write)
- Agent invocation optional (use when helpful, not required)
- Multi-file changes allowed
- NO plan mode required

---

## When to Use /panel-fix

**Appropriate for**:
- Code review fix sprints tracked in Panel Todo
- Well-defined fixes with clear scope (from `/panel-review` findings)
- Multi-file bug fixes that exceed `/quick-fix` limits
- Any Panel Todo issue from a code review sprint

**NOT appropriate for**:
- New features (use `/dev`)
- Large architectural changes (use `/refactor`)
- Security-critical changes (use `/fix` with full audit trail)

---

## Workflow Steps

### Step 1: LOAD PANEL TODO ISSUE

```
panelTodo_getIssue(key="PT-xxx")
```

### Step 2: INVESTIGATE

Read relevant files, understand the root cause, determine the fix.

### Step 3: IMPLEMENT

Fix the code directly or invoke agents if the change is complex:
- **Simple fixes**: Use Edit/Write tools directly
- **Complex fixes**: Optionally invoke specialized agents

### Step 4: COMPLETE

Mark the Panel Todo issue as done:
```
panelTodo_completeIssue(issueId="...")
```

Report: `Done: [PT-xxx] [brief description] — Files changed: [list]`

---

## Differences from Other Workflows

| Aspect | /quick-fix | /panel-fix | /fix |
|--------|-----------|------------|------|
| Scope | 1-2 files | Multi-file sprint work | Complex, needs investigation |
| Tracking | None | Panel Todo | Optional |
| Direct edits | Yes | Yes | No (agents only) |
| Agents | Optional | Optional | Required |
