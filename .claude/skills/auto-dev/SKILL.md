---
name: auto-dev
description: Autonomous development loop. Picks up auto-ok tasks from your ticket tracker, implements, tests, and commits without human gates. Designed for cron-based operation.
---

# /auto-dev - Autonomous Development Loop

**Purpose**: Pick up the next `auto-ok` task from your ticket tracker, implement it, run tests, commit (never push), and update the ticket. No plan mode, no agents, no human approval gates. One task per invocation.

**Designed for**: Cron-based autonomous operation (e.g., `/loop 20m /auto-dev`).

**The contract**: You label a ticket `auto-ok` when its spec is clear enough that a developer wouldn't need to ask questions. Claude implements it, commits, and comments with results. You review the commits when you're ready — nothing reaches the remote without you.

---

## Workflow Steps

### Step 1: PICK & CLAIM

Query the ticket tracker for available work, fetching a batch to handle contention:

```
status = "To Do" AND labels = "auto-ok"
ORDER BY priority DESC, created ASC
LIMIT 5
```

- **If no tasks found**: Output `"Auto-dev: No auto-ok tasks available."` and **STOP**.
- **If tasks found**: CLAIM the first by transitioning it to "In Progress".
  - **Transition succeeds** → this session owns the task. Proceed.
  - **Transition fails** (already claimed) → try the next candidate.
  - **All 5 fail** → output `"Auto-dev: All available tasks claimed by other sessions."` and **STOP**.

**Why a batch + transition-as-claim**: Multiple `/auto-dev` loops may run concurrently. The status transition is an atomic claim — only one session can move a ticket from "To Do" to "In Progress". Fetching 5 gives fallbacks without extra queries.

---

### Step 2: SAFETY CHECK

Read the ticket and evaluate (30 seconds max). Proceed ONLY if ALL are true:

- [ ] Clear, testable acceptance criteria exist
- [ ] Scope is small (≤5 files estimated)
- [ ] No design decisions required (the "what" is fully specified)
- [ ] Does NOT touch billing, payments, auth, or personal-data (GDPR) code
- [ ] No data-destructive migrations (no DROP COLUMN / data loss)
- [ ] No breaking API changes

**If any check fails**:
```
1. Comment on the ticket: "Auto-dev: Skipping — needs human input: {reason}"
2. Remove the `auto-ok` label
3. Transition back to "To Do"
4. STOP
```

---

### Step 3: PREFLIGHT

Before coding, understand what exists:
1. Search for existing code matching the task (Glob/Grep)
2. Read the relevant `.claude/contexts/{module}-context.md` if applicable
3. Check git status — ensure a clean working tree on the correct branch

If the working tree is dirty or on the wrong branch, **STOP** and log it (see Escape Hatches).

---

### Step 4: IMPLEMENT

Direct implementation — no plan mode, no agents:
1. Make changes directly with Edit/Write
2. Keep changes minimal and focused
3. Follow existing code patterns — don't invent new abstractions
4. Maximum 5 files

**Do NOT**: refactor surrounding code, add features beyond the ticket, touch sensitive domains, or create data-destructive migrations.

---

### Step 5: VERIFY

Run the tests appropriate to the change. **If tests fail**: attempt a fix (max 2 retries). If still failing, **ESCALATE** (see Escape Hatches) — commit what works, comment, leave "In Progress".

---

### Step 6: COMMIT (never push)

Stage only the specific files you changed and commit with a conventional message referencing the ticket:

```
{type}: {description}

{body if needed}

Ref: {TICKET-KEY}
```

**Do NOT push.** The human reviews before anything reaches the remote — this is the safety net.

---

### Step 7: COMPLETE

```
1. Comment on the ticket:
   "Auto-dev completed. Changes committed (not pushed).
    Files changed: {list}
    Tests: {pass/fail summary}
    Commit: {hash}
    Review needed before push."
2. Transition to "Done"
3. STOP — wait for the next cron fire
```

---

## Escape Hatches

The loop is designed to fail safely. When anything unexpected happens, STOP and comment.

| Situation | Action |
|-----------|--------|
| No tasks available | Output message, STOP, do nothing |
| All tasks claimed by other sessions | STOP (normal in multi-session) |
| Task bigger than expected | STOP, comment, remove `auto-ok` label, return to "To Do" |
| Needs a design decision | STOP, comment with the question, remove `auto-ok`, add `needs-input` |
| Touches sensitive code (billing/auth/PII) | STOP, comment, remove `auto-ok`, return to "To Do" |
| Tests fail after 2 retries | Commit partial, comment, leave "In Progress" |
| Dirty working tree / wrong branch | STOP, comment, leave for human |
| Build/test infra unreachable | STOP, log, retry next cycle |
| Ticket tracker unreachable | STOP gracefully, log, skip this cycle |

---

## Task Selection Criteria

A ticket earns `auto-ok` when it meets ALL of these:

| Criterion | Example |
|-----------|---------|
| Clear, testable acceptance criteria | "All 4 tests pass" / "Endpoint returns X" |
| Scope ≤5 files | Bug fix, test fix, small additive change |
| No design decisions | The "what" is fully specified |
| No breaking changes | Additive only, or internal refactor |
| No sensitive domains | Not billing, payments, auth, or PII |
| No data-destructive migrations | No DROP COLUMN, no data-loss risk |

---

## Design Decisions

- **Why no plan mode?** Tasks are pre-planned by their ticket. The `auto-ok` label IS the plan approval.
- **Why no agents?** Speed and simplicity. Agent chains add overhead unnecessary for well-specified tasks.
- **Why never push?** The human always reviews before code reaches the remote.
- **Why remove the label on escalation?** Prevents the loop from retrying the same stuck task every cycle.

---

## What Claude MUST Do
1. Pick exactly ONE task per invocation
2. Run the safety check before implementing
3. Follow existing code patterns
4. Run tests before committing
5. Comment on the ticket with results
6. STOP on any Escape Hatch

## What Claude MUST NOT Do
1. Push to remote (human reviews first)
2. Guess on design decisions (STOP and comment)
3. Implement more than the ticket asks
4. Touch billing / payments / auth / personal-data code
5. Create data-destructive migrations
6. Retry a task that was already escalated (`auto-ok` removed)

---

## Enforcement

`/auto-dev` is EXEMPT from the Stop hook's agent-requirement enforcement (same category as `/quick-fix`). Direct implementation is the intended mode.
