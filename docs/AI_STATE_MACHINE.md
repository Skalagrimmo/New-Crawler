# NPC AI State Machine

## Core states

### PATROL
Follows a predefined or generated route. Uses a low-cost simulation tick.

### SUSPICIOUS
The NPC has incomplete evidence. Detection rises while the player remains exposed and can decay after exposure ends.

### INVESTIGATE
Moves toward a sound, visual clue or last known location.

### ALERT
The NPC has confirmed a threat and can communicate/escalate the situation.

### SEARCH
The player is no longer visible. The NPC checks the last known position and nearby search points.

### COMBAT
Uses the existing combat system. This state should reuse current damage, shield, scan/stun, hacking and boss logic.

## Data separation

AI state should live separately from rendering:

- state
- stateTimer
- patrolRoute
- patrolIndex
- lastKnownPosition
- investigationTarget
- detection
- alertLevel

Rendering reads this state; it does not own the decision logic.

## Tick policy

AI does not need to run at render frequency.

Use a controlled AI tick and prioritize nearby/active NPCs. Distant NPCs can update less frequently.

## First implementation

Start with one guard and one route. Do not implement a full faction AI system before this loop works:

**patrol → see player → suspicion → alert → lose player → search → return**
