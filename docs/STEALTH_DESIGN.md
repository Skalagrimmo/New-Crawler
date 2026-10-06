# Stealth Design

Stealth is built around information, visibility and escalation rather than instant combat.

## Detection model

Each guard has:

- vision range
- vision angle
- facing direction
- alertness
- detection progress
- last known player position
- investigation target
- optional hearing/noise sensitivity

Line of sight is blocked by world geometry.

Detection should accumulate over time. Partial exposure can produce suspicion instead of immediately starting combat.

## NPC state machine

PATROL → SUSPICIOUS → INVESTIGATE → ALERT → SEARCH → PATROL

Combat is a fallback branch:

ALERT → COMBAT

Possible transitions:

- Player enters vision: PATROL → SUSPICIOUS
- Detection reaches threshold: SUSPICIOUS → ALERT
- Player disappears: ALERT → SEARCH
- Search expires: SEARCH → PATROL
- Player is confirmed nearby/hostile: ALERT → COMBAT
- Noise or alarm: PATROL/SUSPICIOUS → INVESTIGATE
- New evidence during search: SEARCH → ALERT

## Readability

The player must be able to understand why detection happened.

Use lightweight feedback:

- vision cone
- suspicion indicator
- alert indicator
- search marker
- alarm state

Avoid hidden dice rolls as the primary explanation.

## MGS-like principle

The interesting failure state is not simply "you were seen".

It is:

**seen → alarmed → enemies react → player adapts → escape/hack/fight.**

That preserves the existing combat and hacking systems instead of replacing them.
