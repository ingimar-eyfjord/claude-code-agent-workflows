# Context Documents

Context documents replace read-only "expert" agents with rich markdown files that agents read before implementing.

## Why Context Docs Instead of Expert Agents

| Approach | Cost | Speed | Maintenance |
|----------|------|-------|-------------|
| Expert agent (haiku, read-only) | ~5K tokens overhead per invocation | Slow (agent startup) | High (update agent + docs) |
| Context document (markdown) | Zero overhead | Instant (file read) | Low (update one file) |

## How to Create a Context Document

For each bounded context / major module in your project, create a markdown file:

```
.claude/contexts/
  auth-context.md
  orders-context.md
  payments-context.md
  notifications-context.md
```

## Template

```markdown
# {Module} Context

> Source of truth for {module description}.

## Overview

What this module handles (3-5 bullet points).

## Key Models

### {Model Name}
**Table**: `table_name`

Core fields:
- `field_name` - Description
- `status` - ENUM values listed

Relationships:
- `other_model` -> FK to OtherModel

## File Locations

| File | Purpose |
|------|---------|
| `backend/{module}/models.py` | All models |
| `backend/{module}/services.py` | Write operations |
| `backend/{module}/selectors.py` | Read operations |
| `backend/{module}/api/views.py` | REST endpoints |

## Cross-Module Dependencies

### This Module -> Other Modules
- What it imports from other modules and why

### Other Modules -> This Module (inbound)
- What other modules depend on from this module

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/{module}/` | GET | List resources |
| `/{module}/{id}/` | GET | Get single resource |
| `/{module}/` | POST | Create resource |

## State Machines / Lifecycles

```
STATE_A -> STATE_B -> STATE_C
             |
          STATE_D
```

## Gotchas

1. **{Gotcha title}**: Description of the trap and how to avoid it.
2. **{Gotcha title}**: Description.
```

## Enriching with Dependency Data

If you use a codebase knowledge graph (like Axon), enrich context documents with real dependency data:

```markdown
## Cross-Module Dependencies (from Axon)

### Orders -> Payments (CRITICAL)
- `OrderService.complete_order()` (services.py:145) calls `PaymentService.capture()`
- `OrderSerializer.get_payment_status()` reads from Payment model

### Orders -> Inventory
- `OrderService.place_order()` calls `InventoryService.reserve_stock()`
```

This gives agents real file:line references instead of abstract descriptions.

## When to Update

- After adding new models or changing relationships
- After adding new API endpoints
- After discovering new gotchas or common mistakes
- After major refactoring that changes file structure
