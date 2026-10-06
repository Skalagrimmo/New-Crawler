# Level Generation 2.0

The current maze generator proves connectivity. The next generator must prove gameplay structure.

## Generation pipeline

1. Generate a connected macro layout.
2. Assign room/area roles.
3. Create primary and secondary routes.
4. Place security and observation points.
5. Place objectives and terminals.
6. Place patrol routes.
7. Validate reachability and stealth alternatives.
8. Spawn loot/resources and optional encounters.
9. Validate the final sector before play.

## Area roles

Initial vocabulary:

- ENTRY
- CORRIDOR
- STORAGE
- SECURITY
- TERMINAL
- SAFE
- OBJECTIVE
- EXIT
- OPTIONAL/SIDE ROOM

These are gameplay roles, not necessarily literal visual room types.

## Required properties

A generated sector should have:

- at least one safe route
- at least one risky/direct route
- at least one optional branch
- at least one security/observation element
- an objective and exit
- no unreachable critical content

## Stealth validation

Before accepting a generated sector, validate:

- player can reach objective
- player can reach exit
- patrol routes are connected
- critical rooms are not permanently sealed
- at least one meaningful stealth approach exists

The generator should create situations, not just corridors.
