# Implementation Tasks: Chrono-FSM (Skeleton Crew Track)

- [x] 1. FSM Core Engine Definition
  - [x] 1.1 Complete `src/core/fsm-engine.ts` with state lifecycle, deterministic transitions, and probabilistic branching.
  - [x] 1.2 Export pure JavaScript/ESM module `src/core/fsm-engine.js` with browser & Node.js compatibility.
  - [x] 1.3 Add base64 snapshot serialization/deserialization for 0-Bit URL Hash persistence.

- [x] 2. Integrate FsmEngine into App 1 (Neon Focus Clock)
  - [x] 2.1 Import `FsmEngine` into `index.html` via ESM module.
  - [x] 2.2 Wire `clockSchema` into an active `FsmEngine` instance (replace mock variables).
  - [x] 2.3 Implement START, PAUSE, RESUME, EXPIRE, RESET events through `engine.send()`.
  - [x] 2.4 Bind FSM state changes to the UI badge and Pomodoro timer display.

- [x] 3. Integrate FsmEngine into App 2 (Halloween Jack-in-the-Box)
  - [x] 3.1 Wire `boxSchema` with tension states (`IDLE -> WINDING_1 -> WINDING_2 -> READY_TO_POP`).
  - [x] 3.2 Implement true 50/50 probabilistic pop branching (`POPPED_TREAT` vs `POPPED_TRICK`) via `engine.send('POP')`.
  - [x] 3.3 Add visual shake animation and distinct Web Audio soundscapes for Treat and Trick.
  - [x] 3.4 Wire timeout/reset actions to close the box smoothly.

- [x] 4. Zero-Bit URL Hash & State Synchronization
  - [x] 4.1 Update `window.location.hash` with state snapshot on every transition.
  - [x] 4.2 Add page-load hash reader to restore active app and FSM state automatically.

- [x] 5. Functional Baseline Verification
  - [x] 5.1 Run `node tests/verify_chrono.js` to assert structural invariants, engine import, and state handling.
  - [x] 5.2 Verify baseline unit tests pass.

- [x] 6. Visual Polish & Canvas 2D Engines (Award-Winning Upgrade)
  - [x] 6.1 Replace clock text with Canvas 2D circular neon arc gauge (`clock-canvas`) with breathing pulse & focus waveform.
  - [x] 6.2 Replace static emojis with Canvas 2D procedural mechanical Jack-in-the-box (`box-canvas`) featuring crank rotation and tension wobble physics.
  - [x] 6.3 Implement dynamic particle burst engine (60+ candy confetti for Treat, blood-lightning glitch & sparks for Trick).
  - [x] 6.4 Build real-time interactive FSM Node Graph visualizer (`fsm-graph-canvas`) with glowing active state node and edge transition pulse.

- [x] 7. High-End Verification & 60 FPS Polish
  - [x] 7.1 Verify unified `requestAnimationFrame` loop handles both apps and graph visualizer smoothly.
  - [x] 7.2 Run updated `node tests/verify_chrono.js` to achieve 100% PASS on visual canvas invariants.
- [x] 8. Submission Polish
  - [x] 8.1 Rewrite `README.md` around the "one engine, zero modifications, two apps" story, including Spec-Driven workflow and 0-Bit URL Hash docs.
  - [x] 8.2 Synchronize `src/core/fsm-engine.ts` with `src/core/fsm-engine.js` (identical runtime logic and API surface; `.js` is the source of truth).
  - [x] 8.3 Organize specs under `.kiro/specs/chrono-fsm/` and fix stale path references.
  - [x] 8.4 Add Web Audio autoplay guard (AudioContext created and resumed on first user gesture).
- [ ] 9. App 3: Haunted Vending Machine (proves the skeleton generalizes, zero engine changes)
  - [ ] 9.1 Define `vendSchema` (guard, 60/25/15 branch, kick self transition, timeouts) between `// <schema:vending>` markers in `index.html`.
  - [ ] 9.2 Add the third tab, controls and live messages; wire `COIN`, `SELECT`, `KICK`, `TAKE`, `RESET` through `engine.send()` with explanatory notices when `send()` returns `false`.
  - [ ] 9.3 Render the machine on `vend-canvas` (coin, drop physics, jam, haunted effects) inside the unified animation loop, with Web Audio cues.
  - [ ] 9.4 Support the third app in the node graph (self-transition loop), URL hash (`#app=vend`) and state restore.
  - [ ] 9.5 Extend `tests/verify_chrono.js` with behavioral tests that extract `vendSchema` and run it on the real engine; confirm `fsm-engine.js` is unchanged.
