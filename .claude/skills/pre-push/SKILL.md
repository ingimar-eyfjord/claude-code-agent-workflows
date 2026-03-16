---
name: pre-push
description: Pre-push validation workflow. Build, lint, test, fix issues before pushing.
---

# /pre-push - Pre-Push Validation

**Purpose**: Validate everything before pushing to remote. Prevents CI/CD failures.

**Key Characteristics**:
- Direct edits allowed (fixing lint/test issues)
- No agents required
- No task tracking required
- Runs build, lint, and test commands

---

## Workflow

### Step 1: CHECK GIT STATUS

```bash
git status
git diff --stat
```

Understand what's about to be pushed.

### Step 2: COMMIT (if uncommitted changes)

Stage and commit with a descriptive message.

### Step 3: BUILD

Run the project's build command:
```bash
# Frontend
npm run build  # or pnpm build, yarn build

# Backend
# (usually no build step for Python — skip if not applicable)
```

Fix any build errors.

### Step 4: LINT

Run linters:
```bash
# Frontend
npm run lint

# Backend
# flake8, eslint, prettier, etc.
```

Fix any lint errors (auto-fix where possible).

### Step 5: TEST

Run the test suite:
```bash
# Frontend
npm test

# Backend
pytest
```

Fix any test failures.

### Step 6: CONFIRM

```
Pre-push validation complete:
- Build: PASS
- Lint: PASS (N issues fixed)
- Tests: PASS (N tests)

Ready to push.
```

---

## If Issues Found

Fix issues directly (this workflow allows direct edits) and create a new commit for the fixes. Don't amend — keep the fix separate for clarity.

---

## What's Allowed

- Direct Edit/Write (for fixing lint/test issues)
- Bash commands (build, lint, test, git)
- Creating commits

## What's Blocked

- Pushing to remote (human decides when to push)
- Force-pushing
- Destructive git operations
