---
name: architect-review
description: Architecture analysis via Axon knowledge graph. Design (pre-dev) and Review (post-dev) modes.
---

# /architect-review - Architecture Analysis Workflow

**Purpose**: Pre-development sprint design and post-development QA review, powered by the Axon codebase knowledge graph.

**Two modes**:
- **Design** (pre-dev): Blast radius analysis, dependency mapping, story ordering
- **Review** (post-dev): Side effect detection, dead code delta, boundary violations

---

## Invocation

```
/architect-review design                # Pre-dev: blast radius, dependencies, story ordering
/architect-review review                # Post-dev: side effects, dead code, boundary violations
/architect-review review main..HEAD     # Post-dev with specific git range
```

---

## Mode 1: Design (Pre-Dev)

Use **before** starting development work.

### Steps

1. **Gather context** — What features are planned? Which modules are involved?

2. **Blast radius analysis** — Use `axon_impact` to see what depends on target symbols:
   ```
   axon_impact(symbol="Order", depth=2)
   ```

3. **Dependency mapping** — Use `axon_context` and `axon_cypher` for cross-module relationships:
   ```
   axon_cypher(query="MATCH (a)-[r:IMPORTS]->(b) WHERE a.module <> b.module RETURN a.module, b.module, count(r)")
   ```

4. **Dead code baseline** — Capture current state for later comparison:
   ```
   axon_dead_code(context="payments")
   ```

5. **Risk assessment** — Categorize changes as High/Medium/Low risk

6. **Output** — Design report with recommended story ordering and risk labels

### Design Report Output

```markdown
# Architecture Design: {Topic}

## Blast Radius
| Symbol | Module | Dependents | Risk |
|--------|--------|------------|------|

## Cross-Module Dependencies
{Table of imports crossing module boundaries}

## Recommended Story Ordering
1. {Story 1} — foundational, others depend on this
2. {Story 2} — depends on Story 1
3. {Story 3} — independent, can parallelize
```

---

## Mode 2: Review (Post-Dev)

Use **after** development, before merging.

### Steps

1. **Detect changes** — `axon_detect_changes(git_range="main..HEAD")`

2. **Blast radius of actual changes** — For each changed symbol, check impact

3. **Cross-module side effects** — Did changes in one module break another?

4. **Dead code delta** — New dead code introduced? Old dead code cleaned up?

5. **Architecture fitness** — Invoke `architecture-tester` agent for comprehensive checks

6. **Boundary integrity** — Verify no new cross-module violations

7. **Verdict** — PASS / PASS WITH NOTES / NEEDS ATTENTION

---

## Axon Tool Reference

| Tool | Design | Review | Purpose |
|------|:------:|:------:|---------|
| `axon_impact` | Primary | Primary | What depends on a symbol |
| `axon_context` | Yes | Yes | Full context for a symbol |
| `axon_cypher` | Yes | Yes | Custom graph queries |
| `axon_dead_code` | Baseline | Delta | Find unused code |
| `axon_detect_changes` | -- | Primary | Map git diff to graph |
| `axon_query` | Yes | Yes | Natural language queries |

---

## Useful Cypher Patterns

```cypher
-- Cross-module dependencies
MATCH (a)-[r:IMPORTS]->(b)
WHERE a.module <> b.module
RETURN a.module, b.module, count(r) ORDER BY count(r) DESC

-- Fan-in hotspots (most depended-on symbols)
MATCH (dep)-[r]->(target)
RETURN target.name, target.module, count(dep) AS fan_in
ORDER BY fan_in DESC LIMIT 20

-- Orphaned symbols
MATCH (n) WHERE NOT ()-[:IMPORTS]->(n) AND NOT ()-[:CALLS]->(n)
  AND n.type IN ['class', 'function']
RETURN n.name, n.module, n.file
```

---

## Chaining

```
/architect-review design    <- understand blast radius + order stories
        |
/sprint-planning            <- organize into sprint
        |
/dev or /batch-dev          <- implement
        |
/architect-review review    <- verify no side effects
        |
/pre-push                   <- build, lint, test
```

---

## Enforcement

- Code edits BLOCKED (analysis only)
- .md report writes ALLOWED
- Analysis agents allowed: `arch-planner`, `architecture-tester`, `product-strategy-advisor`
- Implementation agents BLOCKED
