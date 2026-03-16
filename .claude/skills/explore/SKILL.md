---
name: explore
description: Research-only workflow. NO implementation allowed. For investigation, analysis, and reporting.
---

# /explore - Research Workflow

**Purpose**: Investigate, analyze, and report without making any changes. For understanding code, evaluating approaches, or answering questions.

**Key Characteristics**:
- READ-ONLY — no code changes allowed
- No agents required
- No task tracking required
- Output is analysis/recommendations only

---

## When to Use /explore

- Understanding how a feature works
- Evaluating technical approaches before committing
- Investigating a bug without fixing it
- Mapping dependencies between modules
- Answering "how does X work?" questions

---

## Workflow

### Step 1: UNDERSTAND THE QUESTION

Clarify what needs to be investigated.

### Step 2: INVESTIGATE

Use Read, Glob, Grep to explore the codebase:
- Read relevant files
- Search for patterns
- Trace call chains
- Map dependencies

### Step 3: REPORT

Present findings clearly:
- Answer the question
- Provide file:line references
- Suggest next steps (which workflow to use for implementation)

---

## What's Allowed

- Read, Glob, Grep (file exploration)
- Bash for non-destructive commands (git log, git diff, etc.)

## What's Blocked

- Edit, Write (no code changes)
- Destructive bash commands (git commit, rm, etc.)
- Agent invocation (this is research, not implementation)
