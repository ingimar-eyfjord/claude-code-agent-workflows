---
name: preflight-check
description: Validate codebase BEFORE creating tickets. Prevents duplicate work by checking for existing models, APIs, and components.
---

# /preflight-check - Pre-Flight Validation

**Purpose**: Search the codebase to discover existing functionality BEFORE creating tickets or starting implementation. Prevents building things that already exist.

---

## When to Use

- Before `/dev` — check if the feature already exists
- Before `/sprint-planning` — validate that proposed stories aren't duplicates
- When uncertain — if you're not 100% sure something doesn't exist

---

## How It Works

### Step 1: Parse Feature Description

Extract keywords from the request: entities, actions, domains.

### Step 2: Check Existing Code

```bash
# Models/classes
grep -r "class.*{keyword}" src/*/models.py

# Services/business logic
grep -r "def.*{keyword}" src/*/services.py

# API endpoints
grep -r "{keyword}" src/*/api/

# Frontend components
grep -r "{keyword}" src/components/

# Types/interfaces
grep -r "{keyword}" src/types/
```

### Step 3: Check Documentation

Search your ticket tracker for similar existing or closed tickets.

### Step 4: Report

```
PREFLIGHT CHECK: "{feature description}"

1. MODEL CHECK
   Found: {ModelName} with fields {relevant_fields}

2. BACKEND CHECK
   Services: {found/not found}
   API Endpoints: {found/not found}

3. FRONTEND CHECK
   Components: {found/not found}
   Types: {found/not found}

RECOMMENDATION: PROCEED / MODIFY SCOPE / SKIP

Reason: {explanation}
```

---

## Decision Matrix

| Situation | Recommendation |
|-----------|----------------|
| No existing code | PROCEED — create ticket and implement |
| Partial implementation | MODIFY SCOPE — only build what's missing |
| Full implementation exists | SKIP — point to existing code |
| Similar feature elsewhere | CONSIDER — evaluate reuse vs new |
