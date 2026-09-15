---
id: DISC-002
title: Every indexable page has a canonical URL, a unique title and a description
severity: MUST
status: active
domain: discovery
priority: P1
source:
  - devia
applies_to:
  - agent
  - repository
success_criteria:
  []
requirement: >
  An indexable page MUST declare a canonical URL and carry a title and a description written for that page. Titles and descriptions MUST NOT be produced by repeating the site name, and MUST NOT be identical across pages.
validation:
  automated: true
  manual: true
exceptions: none
---

# DISC-002 — Every indexable page has a canonical URL, a unique title and a description

**Requirement:** An indexable page MUST declare a canonical URL and carry a title and a description written for that page. Titles and descriptions MUST NOT be produced by repeating the site name, and MUST NOT be identical across pages.

**Bad:** Every page titled with the product name, one description copied site-wide, and both `/pricing` and `/pricing/` indexed.

**Good:** Per-page title and description drawn from the page content, one canonical URL, duplicates pointing at it.

## Validation

- A build-time or crawl check reports duplicate titles and descriptions
- A canonical link is present on indexable routes

## Lifecycle

- Status: `active`
- Priority: `P1`
- Exceptions: `none`

## See also

- [DISC-001](../discovery/DISC-001.md)
- [MEMORY.md](../../MEMORY.md)
