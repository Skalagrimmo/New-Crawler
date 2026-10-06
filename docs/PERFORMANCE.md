# Performance Budget

Performance is a first-class development track, not final polish.

## Targets

| Profile | Target |
|---|---:|
| Weak Android | stable 30 FPS |
| Normal device / desktop | stable 60 FPS |
| 30 FPS frame budget | ≤ 33.3 ms |
| 60 FPS frame budget | ≤ 16.7 ms |

## Measure

Record at minimum:

- FPS and frame time
- update time
- render time
- draw calls / sprite batches
- visible sprite count
- particle count
- texture memory
- allocations / garbage-collection pressure when observable
- AI/world simulation time

Test separately on desktop and Android.

## Optimization order

### 1. Renderer
- Minimize Canvas state changes.
- Batch compatible sprites.
- Cull anything outside the viewport.
- Cache static geometry/data.
- Avoid creating objects inside the render loop.
- Keep CRT/post-processing optional.

### 2. Game loop
- Separate simulation and rendering responsibilities.
- Do not perform expensive world work every render frame.
- Give AI a controlled simulation tick.
- Cache derived data instead of recomputing it continuously.
- Avoid per-frame array/object creation.

### 3. Particles and effects
- Keep the existing pooling model.
- Enforce hard per-profile particle limits.
- Reduce expensive effects before reducing gameplay visibility.

### 4. Mobile profiles
Provide quality tiers rather than device-specific hacks:

- Low: reduced particles, render scale/effects reduced, CRT off.
- Medium: normal effects with conservative budgets.
- High: full effects within budget.

## Rule

Never claim an optimization is successful without comparing the measured frame time before and after it.
