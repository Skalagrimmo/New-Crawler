# New-Crawler 0.2 — Infiltration Prototype

Target identity: **MGS1 Remastered × roguelike**.

The existing top-down game loop is the foundation. Version 0.2 does not add mechanics for quantity; it makes the existing loop stable, readable and stealth-capable.

## Priorities

1. **Performance baseline** — measure first; target stable 30 FPS on weak Android and 60 FPS on normal devices.
2. **Top-down polish** — animation states, feedback, transitions and interaction clarity.
3. **World AI** — map-based NPCs with patrol, suspicion, investigation, alert and combat fallback.
4. **Stealth core** — vision, occlusion, detection memory, search and alarm escalation.
5. **Structured procedural sectors** — rooms and routes with gameplay roles instead of maze-only generation.
6. **Roguelike layer** — meaningful run variation, resources and progression without breaking stealth.
7. **FPS 2.0** — deferred until it can share the same world/state model.

## 0.2 Definition of Done

- One complete procedural sector is playable from entry to objective/exit.
- At least one NPC can patrol the actual map.
- Vision cone and line-of-sight produce detection.
- Losing sight transitions into investigation/search rather than instant combat.
- Combat remains a valid fallback.
- Performance is measured with a repeatable profile.
- No major gameplay system requires a parallel implementation for FPS mode.

## Working rule

**Measure → change one bottleneck → measure again → keep/revert.**

Avoid a rewrite. Extend GameCore, GameWorld, Entities and the existing engine systems.
