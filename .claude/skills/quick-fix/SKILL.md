---
name: quick-fix
description: Fast direct-fix workflow. NO tracking required, agents optional. For typos, bug fixes, small refactors — anything with clear scope up to 2 files.
---

# /quick-fix - Direct Fix Workflow

**Purpose**: Fast path for fixes with clear scope. Direct edits, optional agent assistance, no ceremony.

**Key Characteristics**:
- Direct implementation allowed (Edit/Write)
- Agents optional (use `code-refactorer`, `backend-engineer`, etc. when helpful)
- NO task tracking required
- NO plan mode required
- Up to 2 files, focused scope

---

## When to Use /quick-fix

**Appropriate for**:
- Fix a typo or string literal
- Fix a bug in a function (logic change OK)
- Small refactor within a function or class
- Add a missing import, null check, error handler
- Fix incorrect return value or wrong field
- Update a component's behavior (1-2 files)
- Clean up a messy function (invoke `code-refactorer` if helpful)

**Escalate to /fix when**:
- 3+ files need changes
- Requires investigation to find root cause
- Touches API contracts or DB migrations
- Security-critical changes
- Large architectural refactor (use /refactor)

---

## Workflow

### Step 1: ASSESS

| Scope | Approach |
|-------|----------|
| Typo, import, one-liner | Direct edit |
| Bug fix in a function | Read context doc if relevant, direct edit |
| Small refactor / cleanup | Optionally invoke `code-refactorer` |
| Needs investigation | Escalate to `/fix` |

### Step 2: CONTEXT (if needed)

For fixes touching module-specific logic, optionally read the relevant context doc:
```
Read .claude/contexts/{module}-context.md
```
Skip for obvious fixes (typos, imports, simple bugs).

### Step 3: FIX

**Direct edit** (default):
```
[Read file to understand context]
[Use Edit tool to make the fix]
```

**With agent** (optional, for quality):
```
Invoke code-refactorer  -> for cleanup/refactoring
Invoke backend-engineer -> for backend logic
Invoke frontend-engineer -> for frontend fixes
```

### Step 4: VERIFY (proportional)

| Change Type | Verification |
|-------------|-------------|
| Typo, import | Visual check |
| Logic fix | Read surrounding code |
| Refactor | Run relevant tests |

### Step 5: CONFIRM

```
Fixed: [brief description]
Files: [paths]
Change: [what was changed and why]
```

---

## Escalation

If the fix grows beyond scope:
```
This fix is broader than quick-fix scope.
Discovered: [why it's complex]
Options:
- /fix -> full agent pipeline (complex, needs investigation)
- /refactor -> code cleanup with agents
```

---

## Limits

- Maximum **2 files** modified
- No database migrations
- No API contract changes
- If limits exceeded, escalate
