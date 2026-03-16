---
name: batch-dev
description: Parallel coordinated development via Panel Todo sprints. Multiple Claude sessions claim and complete tasks with dependency awareness.
---

# /batch-dev - Parallel Coordinated Development

**Purpose**: Workflow for parallel development across multiple Claude sessions, coordinated via Panel Todo sprints. Each session claims issues, respects dependencies, and invokes agents for implementation.

**Key Characteristics**:
- Panel Todo sprint for coordination
- REQUIRES agent invocation for code changes
- Multiple Claude sessions can work in parallel
- Dependency-aware: `blocked_by` prevents ordering violations

---

## When to Use /batch-dev

**Appropriate for**:
- Large features spanning multiple tracks (backend, frontend, mobile)
- Parallel development with 2-3 Claude sessions
- Well-planned work where issues and dependencies are defined upfront
- Sprint-based execution of `/sprint-planning` output

**NOT appropriate for**:
- Single-session work (use `/dev`)
- Quick bug fixes (use `/quick-fix`)

---

## Prerequisites

A Panel Todo sprint must exist with:
1. **Sprint** created with description (context, rules, file ownership)
2. **Issues** batch-created with tags and `blocked_by` references
3. **Context docs** referenced in sprint description

Set up via `/sprint-planning` before spinning up sessions.

---

## Workflow Steps

### Step 1: LOAD SPRINT

```
panelTodo_getSprint(sprintId="...")
```

Read the sprint description for context, file ownership rules, and agent mapping.

### Step 2: FIND AVAILABLE WORK

```
panelTodo_listIssues(sprintId="...", assignee=null, isBlocked=false)
```

Returns issues that are unassigned AND unblocked (all dependencies completed).

### Step 3: CLAIM THE ISSUE

```
panelTodo_updateIssue(issueId="...", assignee="session-1")
```

### Step 4: READ CONTEXT

Load relevant context document from `.claude/contexts/` before implementing.

### Step 5: INVOKE AGENT

**CRITICAL**: Must invoke a specialized agent for code changes.

| Work Type | Agent |
|-----------|-------|
| Backend | `backend-engineer` |
| Frontend | `frontend-engineer` |
| API contracts | `api-contract-guardian` |
| Testing | `test-engineer` |
| Infrastructure | `infra-ops` |

### Step 6: COMPLETE AND MOVE ON

```
panelTodo_completeIssue(issueId="...")
// This may unblock other issues that had blocked_by this one

panelTodo_listIssues(sprintId="...", assignee=null, isBlocked=false)
// Claim next issue and repeat
```

---

## Multi-Session Coordination

```
SESSION 1 (backend):                 SESSION 2 (frontend):
  /batch-dev                           /batch-dev
  Load sprint                          Load sprint
  listIssues(unassigned, unblocked)    listIssues(unassigned, unblocked)
  Claim PT-1 (create models)           Claim PT-4 (shared types)
  Invoke backend-engineer              Invoke frontend-engineer
  Complete PT-1                        Complete PT-4
  → PT-2, PT-3 now unblocked!         listIssues...
  Claim PT-2                           → PT-3 now available!
                                       Claim PT-3
```

### Rules for parallel sessions

1. **Always query before claiming** — don't assume availability
2. **Respect track ownership** — follow sprint description assignments
3. **Release on exit** — set assignee back to null if you can't finish
4. **Comment on handoffs** — add comments explaining partial state

---

## Sprint Setup Example

```
panelTodo_createSprint({
  name: "API Redesign Sprint",
  description: "File ownership:\n- track-backend: src/api/, src/models/\n- track-frontend: src/components/, src/hooks/"
})

panelTodo_batchCreateIssues({
  sprintId: "...",
  issues: [
    { title: "P1: New data models", priority: "high", tags: ["track-backend"], blocked_by: [] },
    { title: "P2: API endpoints", priority: "high", tags: ["track-backend"], blocked_by: ["PT-1"] },
    { title: "P3: UI components", priority: "medium", tags: ["track-frontend"], blocked_by: ["PT-2"] },
    { title: "P4: Shared types", priority: "high", tags: ["track-shared"], blocked_by: [] },
    { title: "P5: Integration tests", priority: "low", tags: ["track-backend", "track-frontend"], blocked_by: ["PT-2", "PT-3"] }
  ]
})
```

---

## Enforcement

- Direct code edits BLOCKED (must use agents)
- Panel Todo required for coordination
- Tests should pass after each agent completes
