---
name: feature-design
description: Feature design — strategy + architecture, no code. Chains into /dev.
---

# /feature-design - Feature Design Workflow

**Purpose**: Design a feature from idea to actionable plan. Strategic vetting (should we build this?) + architectural design (how should we build it?). No code — analysis and architecture only.

**Agent chain**: `product-strategy-advisor` → `arch-planner`

**Key Characteristics**:
- Analysis only — NO code edits allowed
- Both agents REQUIRED
- .md writes allowed (design documents)
- Chains into `/dev`
- NO task tracker required (optionally creates stories at end)

---

## When to Use /feature-design

**Appropriate for**:
- New feature ideas that need strategic vetting before development
- Features where "should we build this?" is a genuine question
- Complex features spanning multiple modules
- Pre-development design work

**NOT appropriate for**:
- Bug fixes (use `/fix`)
- Small enhancements with clear scope (use `/dev` directly)
- Code quality work (use `/code-sweep` or `/refactor`)

---

## Workflow Steps

### Step 1: UNDERSTAND THE FEATURE

Accept feature description from user. If vague, ask clarifying questions:
- What problem does this solve?
- Who is the primary user?
- What's the expected interaction flow?

### Step 2: PREFLIGHT CHECK (MANDATORY)

**Check existing code before planning.**

1. Search for existing models/classes matching the feature
2. Search for existing API endpoints
3. Search for existing frontend components

| Preflight Result | Action |
|------------------|--------|
| Feature exists fully | STOP — inform user |
| Partial implementation | NOTE — design should build on existing code |
| No existing code | PROCEED |

### Step 3: LOAD CONTEXT (MANDATORY)

Read the relevant context document from `.claude/contexts/` before planning.

### Step 4: INVOKE product-strategy-advisor (REQUIRED)

Invoke the `product-strategy-advisor` agent with:
- Feature description and user context
- Preflight findings (what exists, what's missing)

**Agent produces**:
- ICE score (Impact, Confidence, Ease)
- BUILD / KILL / ENHANCE recommendation
- Priority assessment
- Risk factors

### Step 5: DECISION GATE

Present strategy assessment to user.

| Recommendation | Action |
|----------------|--------|
| **KILL** | STOP — present reasoning. No architecture phase. |
| **ENHANCE** | Continue — scope may be narrower than original idea |
| **BUILD** | Continue — full architecture design |

**Wait for user confirmation before proceeding.**

### Step 6: INVOKE arch-planner (REQUIRED)

Invoke the `arch-planner` agent with:
- Feature description + strategy assessment
- Preflight findings (existing code)
- Context document knowledge

**Agent produces**:
- Affected modules
- New/modified models with field definitions
- API contracts (endpoints, request/response shapes)
- Migration strategy
- Cross-module dependencies
- Proposed stories with acceptance criteria

### Step 7: PRESENT DESIGN DOCUMENT

Present the complete design to user:

```markdown
## Feature Design: [feature name]

### Strategy Assessment
- **Recommendation**: BUILD / ENHANCE
- **ICE Score**: I:[x] C:[x] E:[x] = [total]
- **Priority**: High / Medium / Low

### Architecture
- **Affected modules**: [list]
- **New models**: [list with key fields]
- **API endpoints**: [list with methods]
- **Frontend changes**: [pages/components]
- **Migration notes**: [if any]

### Proposed Stories
1. [Story title] — [brief scope]
2. [Story title] — [brief scope]
...

### Risks & Open Questions
- [Risk or question]
```

### Step 8: OPTIONAL — CREATE STORIES

If user approves and wants stories created in their task tracker.

---

## Enforcement

**This workflow**:
- Sets `direct_edits_allowed=false` (no code changes)
- .md file writes ARE allowed (design documents)
- Both `product-strategy-advisor` and `arch-planner` agents REQUIRED
- Code edits are BLOCKED — this is analysis only
