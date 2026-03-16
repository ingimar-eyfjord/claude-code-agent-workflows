---
name: sprint-planning
description: Sprint prep. Ticket tracker for epics/stories (high-level), Panel Todo for sprint execution (code-level tasks).
---

# /sprint-planning - Sprint Planning Workflow

**Purpose**: Organize and prepare sprints using a two-tier tracking strategy: your ticket tracker (Jira, Linear, GitHub Issues) for high-level stories visible to stakeholders, and Panel Todo for code-level implementation tasks visible to Claude sessions.

**Key Characteristics**:
- Design agents allowed (arch-planner for story ordering)
- NO code implementation (planning only)
- Creates both ticket tracker stories and Panel Todo execution tasks
- Chains into `/dev` or `/batch-dev` for implementation

---

## The Two-Tier Strategy

```
TIER 1: Ticket Tracker (Jira, Linear, etc.)     TIER 2: Panel Todo
─────────────────────────────────────────────    ──────────────────────
Stakeholder-visible                               Developer-visible
Epics, stories, acceptance criteria               Code-level tasks
"Build tour sharing feature"                      "Add sharing_token field to Tour model"
                                                  "Create /tours/{id}/share endpoint"
                                                  "Add ShareButton component"
```

**Why two tiers?**
- Stakeholders don't need to see "add migration for sharing_token field"
- Developers don't need to wade through stakeholder-facing acceptance criteria mid-implementation
- Panel Todo supports `blocked_by`, `assignee`, and `isBlocked` for multi-session coordination
- One Jira story often becomes 2-5 Panel Todo tasks

---

## Workflow Steps

### Step 1: GATHER CONTEXT

Understand what needs to be planned:
- What features/changes are in scope?
- What's the priority order?
- Any dependencies or blockers?

### Step 2: CREATE STORIES (Ticket Tracker)

Create high-level stories in your ticket tracker:
- Clear summary with category prefix
- Acceptance criteria (testable)
- Priority and sprint assignment
- Dependencies noted

### Step 3: ARCHITECTURE REVIEW (Optional)

For complex sprints, invoke `arch-planner` to:
- Assess blast radius of planned changes
- Identify cross-module dependencies
- Recommend story ordering
- Flag high-risk changes

### Step 4: SPRINT EXECUTION BRIDGE (Panel Todo)

Bridge from ticket tracker stories to code-level tasks:

```
panelTodo_createSprint(name="Sprint X: {Goal}", goal="{Sprint goal}")

panelTodo_batchCreateIssues(
  sprintId="...",
  issues=[
    # From story PROJ-100 (Build tour sharing)
    { title: "Add sharing_token field to Tour model", priority: "high",
      description: "From PROJ-100. Add UUID field..." },
    { title: "Create /tours/{id}/share endpoint", priority: "high",
      description: "From PROJ-100. POST endpoint...", blocked_by: ["PT-1"] },
    { title: "Add ShareButton component", priority: "medium",
      description: "From PROJ-100. Frontend...", blocked_by: ["PT-2"] },
  ]
)
```

**Mapping**: Each story produces 1-5 Panel Todo tasks. Include the ticket key in description for traceability.

### Step 5: DOCUMENT

Create sprint overview documentation:
- Sprint goal (one sentence)
- Stories grouped by category
- Execution order
- Success criteria

---

## Panel Todo Sprint Fields

| Field | Purpose |
|-------|---------|
| `title` | Code-level task description |
| `description` | Scope, affected files, ticket tracker reference |
| `priority` | critical / high / medium / low |
| `tags` | Track grouping (track-backend, track-frontend) |
| `blocked_by` | Dependency on other Panel Todo issues |
| `assignee` | Which Claude session claimed this task |
| `isBlocked` | Computed: true if any blocked_by is incomplete |

---

## Chaining

```
/sprint-planning                    <- organize stories + create Panel Todo sprint
        |
/batch-dev                          <- parallel sessions claim + implement tasks
        |
/prepare-git-staging                <- validate before push
```

Or for single-session:
```
/sprint-planning -> /dev (one story at a time)
```

---

## Enforcement

- NO code edits allowed (planning only)
- Design agents (arch-planner) allowed
- .md writes allowed (documentation)
