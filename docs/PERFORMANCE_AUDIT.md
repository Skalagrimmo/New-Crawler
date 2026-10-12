# Initial Performance Audit

This is a source-level audit, not a measured profile. Do not treat these findings as proof of the cause of the reported low FPS until verified on-device.

## Confirmed observations

### P1 — Full-map traversal in every 2D frame
`GameCanvas.tsx` traverses the whole map to queue explored tiles and traverses the whole map again for fog/lighting on every animation frame. The world is currently small, but this work scales with map area and creates repeated Canvas operations.

**Next step:** measure render time, then limit tile/fog work to the camera viewport plus a one-tile margin. Preserve fog-of-war correctness at viewport edges.

### P1 — Per-sprite Canvas save/restore and transforms
`SpriteBatcher.render()` performs `save()`, translations and `restore()` for each sprite. This is simple and robust but may be expensive on mobile Canvas implementations.

**Next step:** profile before redesigning; first cull off-screen sprites and measure the effect. Consider a fast path for unrotated, unscaled sprites only if measurements justify it.

### P1 — Profiler publishes React state every animation frame
`GameCanvas.tsx` calls `onUpdateStats(...)` inside the render loop. If the parent callback updates React state synchronously, this can cause app-level React work at frame frequency.

**Next step:** inspect the parent callback and throttle HUD/stat updates to a modest interval (for example 4–5 times per second), independently of rendering.

### P2 — Synthetic input-latency metric
The profiler currently assigns `inputLatencyMs` using `Math.random()`. This is not a measurement and can mislead optimization decisions.

**Next step:** label it as unavailable until real input timestamps can be correlated, or implement a real input-to-frame measurement.

### P2 — Width/height loop mismatch
The tile queue loop uses `x < mapH` while the same renderer has `mapW` available. The current generated map appears square, so this may not cause the current slowdown, but it is incorrect for non-square worlds.

**Next step:** use the width bound and add a rectangular-world regression test if non-square maps are supported.

## Measurement protocol

1. Capture a repeatable baseline on desktop and Android.
2. Record average and p95 frame time, FPS, render/update time, sprites queued, draw calls and active particles.
3. Change one bottleneck per commit.
4. Repeat the same scene and compare before/after.
5. Keep a change only if the measurement improves without visual/gameplay regressions.

## Non-goals for the first pass

- Do not rewrite the renderer.
- Do not build stealth AI before the frame loop is measurable.
- Do not use random/synthetic numbers as performance evidence.
