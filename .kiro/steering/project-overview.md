---
inclusion: always
---
# Chrono-FSM project overview

Kiroween 2026, Skeleton Crew track. One FSM engine with zero external runtime dependencies (pure vanilla JS, Canvas 2D, Web Audio API) drives three distinct apps:
- App 1: Neon Focus Clock (IDLE, FOCUSING, PAUSED, BREAK)
- App 2: Halloween Jack-in-the-Box (IDLE, WINDING_1, WINDING_2, READY_TO_POP, POPPED_TREAT / POPPED_TRICK, 50/50 branch)
- App 3: Haunted Vending Machine (IDLE, HAS_COIN, DISPENSED, JAMMED, HAUNTED; credit guard, 60/25/15 branch, kick self transition, timeouts)

Headline claim: the engine is shared with ZERO modifications. Apps differ only by schema and UI listeners.

## Layout
- `src/core/fsm-engine.js`: engine, runtime source of truth
- `src/core/fsm-engine.ts`: typed twin, identical runtime logic
- `index.html`: all three apps, Canvas 2D renderers, FSM node graph, Web Audio, URL hash sync
- `tests/verify_chrono.js`: verifier, run with `npm test`
- `.kiro/specs/chrono-fsm/`: requirements, design, tasks, visual spec

## Conventions
- No external dependencies, no image assets. Canvas 2D and Web Audio only.
- Serve over HTTP (`npm start`), ES modules do not load from `file://`.
- Audio must stay behind a user gesture (see `unlockAudio` in index.html).