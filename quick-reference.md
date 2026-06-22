# Quick Reference — Claude Code Agents & Workflows

Cheat sheet for workflow selection.

---

## Which Workflow Do I Use?

```
New feature idea?                -> /feature-design (strategy + architecture, no code)
Feature work?                    -> /dev (agents required)
Bug fix (clear, 1-2 files)?     -> /quick-fix (direct edit)
Bug fix (needs investigation)?  -> /fix (agents required)
Code cleanup?                    -> /refactor (agents required)
Code quality pass?               -> /code-sweep (review + fix structural, ticket behavioral)
Code review (with tracking)?     -> /panel-review -> /panel-fix PT-xxx (repeat)
Code review (quick, no tracking)?-> /code-review
Parallel feature sprint?         -> /batch-dev (Panel Todo coordination)
Autonomous background loop?      -> /auto-dev (cron-driven, picks auto-ok tasks)
Just researching?                -> /explore
Sprint prep?                     -> /sprint-planning (tickets + Panel Todo)
Architecture analysis?           -> /architect-review design | review
Check if feature exists?         -> /preflight-check "description"
Ready to push?                   -> /pre-push
Documentation only?              -> /docs
```

---

## Decision Tree

```
Have a feature idea to vet?
|-- Yes -> /feature-design (strategy + architecture, no code)
|
Found a bug or issue?
|-- Clear scope, 1-2 files? -> /quick-fix (direct edit, optional agents)
|-- Needs investigation or 3+ files? -> /fix (agent pipeline)
|
Code quality pass?
|-- Review + fix structural? -> /code-sweep (fixes structural, tickets behavioral)
|-- Review only (track fixes)? -> /panel-review -> /panel-fix PT-xxx
|-- Review only (no tracking)? -> /code-review
|
Just need to understand something?
|-- Yes -> /explore (read-only research)
|
Planning a sprint?
|-- Yes -> /sprint-planning (ticket tracker + Panel Todo)
|
Need architecture analysis?
|-- Pre-dev -> /architect-review design (Axon blast radius)
|-- Post-dev -> /architect-review review (Axon side effects)
|
Ready to commit and push?
|-- Yes -> /pre-push (build, lint, test, fix)
|
Want autonomous background work?
|-- Yes -> /loop 20m /auto-dev (cron picks auto-ok tasks)
|
Need to change code?
|-- Cleanup/refactor? -> /refactor
|-- Parallel multi-track? -> /batch-dev
|-- Feature/story? -> /dev
```

---

## Workflow Ladder (lightest to heaviest)

| Skill | Scope | Direct Edits | Agents | Tracking |
|-------|-------|:------------:|:------:|----------|
| `/quick-fix` | 1-2 files, clear fix | Yes | Optional | None |
| `/docs` | .md files only | .md only | No | None |
| `/explore` | Read-only | No | No | None |
| `/preflight-check` | Read-only | No | No | None |
| `/code-review` | Read-only | No | Optional | None |
| `/panel-review` | Read-only | No | Optional | Panel Todo (creates) |
| `/panel-fix` | Multi-file | Yes | Optional | Panel Todo (completes) |
| `/feature-design` | Read-only | No | Required (strategy+arch) | None |
| `/code-sweep` | Any | Structural only | Required (reviewer+refactorer) | Panel Todo (behavioral) |
| `/auto-dev` | Any | Yes | No | Ticket tracker (`auto-ok` label) |
| `/pre-push` | Any (fix lint/tests) | Yes | No | None |
| `/refactor` | Any | No | Required | Optional |
| `/fix` | Any | No | Required | Optional |
| `/dev` | Any | No | Required | Optional |
| `/batch-dev` | Any | No | Required | Panel Todo (sprint) |
| `/sprint-planning` | Read-only | No | Design only | Ticket tracker + Panel Todo |
| `/architect-review` | Read-only | No | Analysis only | None |

---

## Agent Chains

| Work Type | Chain |
|-----------|-------|
| Backend | `arch-planner` -> `backend-engineer` -> `test-engineer` -> `api-contract-guardian` |
| Frontend | `frontend-engineer` -> `test-engineer` -> `api-contract-guardian` -> `design-reviewer` |
| Full-stack | `arch-planner` -> `backend-engineer` -> `frontend-engineer` -> `test-engineer` |
| Bug fix | `backend-engineer` or `frontend-engineer` -> `test-engineer` |
| Feature Design | `product-strategy-advisor` -> `arch-planner` |
| Code Sweep | `code-reviewer` -> `code-refactorer` |
| Code cleanup | `code-reviewer` -> `code-refactorer` -> `test-engineer` |
| Architecture | `arch-planner` + `architecture-tester` + `product-strategy-advisor` |
| Infrastructure | `infra-ops` -> `arch-planner` |

---

## Agent Roster

| Agent | Model | Role |
|-------|-------|------|
| `arch-planner` | opus | Architecture, API design |
| `backend-engineer` | opus | Backend implementation |
| `frontend-engineer` | opus | Frontend implementation |
| `test-engineer` | opus | Test automation |
| `code-reviewer` | sonnet | Code review + severity |
| `code-refactorer` | sonnet | Code cleanup |
| `api-contract-guardian` | haiku | API type alignment |
| `security-reviewer` | opus | Security audit |
| `infra-ops` | opus | Docker, CI/CD, deploy |
| `design-reviewer` | sonnet | UI/UX, accessibility |
| `product-strategy-advisor` | opus | Product strategy, build/kill/enhance |
| `architecture-tester` | opus | Architecture fitness tests, trends |
| `data-protection-officer` | opus | GDPR/privacy: ROPA, DPIA, retention, consent |

---

## MCP Server Integration

| Workflow | MCP Servers Used |
|----------|-----------------|
| `/quick-fix`, `/code-review` | (none required) |
| `/panel-review`, `/panel-fix`, `/code-sweep` | **Panel Todo** |
| `/batch-dev` | **Panel Todo** (sprint coordination) |
| `/sprint-planning` | **Ticket tracker** (Jira/Linear) + **Panel Todo** |
| `/dev`, `/fix` | **Ticket tracker** (optional) |
| `/auto-dev` | **Ticket tracker** (task picking + claiming) |
| `/architect-review` | **Axon** (knowledge graph) |
| `/explore` | **Context7** (library docs) |

---

## Quick Invocation Examples

```
/quick-fix                                # Direct bug fix (1-2 files)
/quick-fix Fix the null check             # With description
/feature-design "user notifications"      # Strategy + architecture design
/code-sweep "payment module"              # Review + fix structural, ticket behavioral
/panel-review src/services/               # Code review -> creates fix tickets
/panel-fix PT-101                         # Fix a review ticket
/batch-dev                                # Parallel coordinated (Panel Todo sprint)
/code-review src/services/                # Quick review (no tracking)
/dev                                      # Full feature (no tracker)
/fix                                      # Complex bug investigation
/refactor                                 # Code cleanup
/sprint-planning                          # Sprint prep (stories + tasks)
/architect-review design                  # Pre-dev blast radius
/architect-review review                  # Post-dev side effects
/preflight-check "Tour stops with GPS"    # Check before building
/explore                                  # Research only
/docs                                     # Documentation changes
/pre-push                                 # Pre-push validation
/auto-dev                                 # One autonomous cycle (pick + implement + commit)
/loop 20m /auto-dev                       # Start autonomous loop (every 20 min)
```

---

## Context Documents

Instead of expert agents, read context docs:

```
.claude/contexts/
  {module}-context.md     # Models, services, APIs, gotchas per module
```

Agents read these before implementing. See `.claude/contexts/README.md` for the template.

---

## Typical Development Flows

### Full Feature Pipeline

```
    /feature-design (should we build? how?)
         |
    /sprint-planning (stories + Panel Todo tasks)
         |
    /batch-dev (parallel sessions implement)
         |
    /code-sweep (fix structural, ticket behavioral)
         |
    /pre-push (build, lint, test)
         |
      git push
```

### Architecture-First Pipeline

```
    /architect-review design (Axon blast radius)
         |
    /dev or /batch-dev (implement)
         |
    /architect-review review (verify no side effects)
         |
    /pre-push
```

### Common Flows

- **Feature pipeline**: `/feature-design` -> `/sprint-planning` -> `/batch-dev` -> `/pre-push`
- **Quick iteration**: `/dev` -> `/pre-push` -> push
- **Bug hotfix**: `/quick-fix` or `/fix` -> `/pre-push` -> push
- **Quality pipeline**: `/code-sweep` -> `/panel-fix PT-xxx` (behavioral) -> `/pre-push`
- **Code review sprint**: `/panel-review` -> `/panel-fix PT-1` -> `/panel-fix PT-2` -> ...
- **Autonomous loop**: `/loop 20m /auto-dev` (cron picks `auto-ok` tasks, implements, commits)
- **Exploration**: `/explore` -> decide next step
