# Chrono-FSM: One Core, Two Apps

> **Kiroween 2026 · Skeleton Crew Track**
> A zero-dependency, pure finite state machine engine driving two radically distinct apps with **ZERO engine modifications**.

| App 1: Neon Focus Clock | App 2: Halloween Jack-in-the-Box |
| --- | --- |
| Pomodoro-style deep work timer | Crank-and-pop music box with a 50/50 Treat or Trick |
| `IDLE → FOCUSING ⇄ PAUSED → BREAK` | `IDLE → WINDING_1 → WINDING_2 → READY_TO_POP → POPPED_TREAT / POPPED_TRICK` |

Both apps import the same file, `src/core/fsm-engine.js`, and differ only in the **schema** (a plain object) they hand to it.

---

## The Skeleton Idea

The track asks for a clean, flexible skeleton that proves its versatility by powering two distinct applications. This project makes that literal:

```
              ┌─────────────────────────────┐
              │  src/core/fsm-engine.js     │   ~150 lines, no dependencies
              │  states · transitions ·     │
              │  guards · probability ·     │
              │  timeouts · hash snapshots  │
              └──────────────┬──────────────┘
          schema A           │           schema B
    ┌────────────────────────┴───────────────────────┐
    ▼                                                ▼
 Neon Focus Clock                          Jack-in-the-Box
 (timer, chime, arc gauge)                 (tension, 50/50 pop, particles)
```

The engine knows nothing about clocks, boxes, canvases or audio. Everything app-specific lives in a schema and in the UI code that listens to `onStateChange`.

### What the engine provides

| Capability | How |
| --- | --- |
| Deterministic transitions | `engine.send('START')` |
| Guards | `guard(context, payload)` on a transition |
| **Probabilistic branching** | several transitions on the same event with `probability` weights |
| Lifecycle hooks | `onEnter` / `onExit`, plus transition `action` |
| Timeouts | `timeout: { durationMs, targetState }`, cleared when another event intervenes |
| Observation | `onStateChange(listener)` and a built-in `history` |
| **0-Bit persistence** | `toHashString()` / `FsmEngine.fromHashString(schema, hash)` |

The 50/50 outcome in the Jack-in-the-Box is not `Math.random()` in the UI. It is two transitions on `POP`, each weighted `0.5`:

```js
READY_TO_POP: {
  transitions: [
    { event: 'POP', target: 'POPPED_TREAT', probability: 0.5, action: (ctx) => { ctx.outcome = 'TREAT'; } },
    { event: 'POP', target: 'POPPED_TRICK', probability: 0.5, action: (ctx) => { ctx.outcome = 'TRICK'; } },
    { event: 'RESET', target: 'IDLE' }
  ]
}
```

---

## App 1: Neon Focus Clock

A 25 minute focus timer rendered as a 360×360 Canvas 2D neon ring.

- The arc drains with the remaining time and glows in several blur passes.
- While `FOCUSING` the ring breathes with a sine pulse, and an oscilloscope waveform runs underneath. It flattens on `PAUSED` and turns emerald on `BREAK`.
- A tick sounds every second, and a chime plays when the session expires.
- Events: `START`, `PAUSE`, `RESUME`, `EXPIRE`, `RESET`.

## App 2: Halloween Jack-in-the-Box

A procedurally drawn mechanical music box (no image assets).

- Each crank advances the FSM one tension level. The crank spins faster and the box shakes harder (±2, ±5, ±8 px). Seams glow and leak light at `READY_TO_POP`.
- **Treat:** a glowing pumpkin springs out, 90 candy confetti and 40 gold sparks burst, and a harmonic C-E-G chime plays.
- **Trick:** a phantom lunges at the camera, with red lightning, glitch slices, embers, a low screech and a screen shake.
- Winding states time out back to `IDLE` after 15 seconds.

## Live FSM Node Graph

Below both apps, a canvas draws the **active schema** as nodes and edges. The current state has a pulsing neon halo, and every transition sends an energy packet along its edge, labelled with the event. It is generated from the same schema objects the engine runs, so it shows the engine at work rather than a mock-up.

---

## 0-Bit URL Hash Persistence

No backend, no storage, no accounts. The full machine state travels in the URL:

```
index.html#app=box&d=<base64 snapshot>
```

`toHashString()` serializes `{ state, context, timestamp }` to base64. On every transition the page writes it to `location.hash`. On load, `fromHashString()` restores the machine, and the page reopens on the right tab. Copy the link mid-crank and the recipient lands on the same tension level. If the hash is invalid, the engine falls back to a fresh machine.

---

## Built with Kiro: Spec-Driven Development

The project was driven by specs under [`.kiro/specs/chrono-fsm/`](.kiro/specs/chrono-fsm):

| File | Role |
| --- | --- |
| [`requirements.md`](.kiro/specs/chrono-fsm/requirements.md) | EARS requirements (`REQ-CORE`, `REQ-CLK`, `REQ-BOX`, `REQ-SYS`) |
| [`design.md`](.kiro/specs/chrono-fsm/design.md) | Architecture diagram and the two FSM schemas |
| [`tasks.md`](.kiro/specs/chrono-fsm/tasks.md) | Checklist the agent worked through and ticked off |
| [`visual-polish-spec.md`](.kiro/specs/chrono-fsm/visual-polish-spec.md) | Canvas 2D rendering spec for the second pass |

The loop: write the requirement, design the schema, implement a task, run `node tests/verify_chrono.js`, tick the checkbox. The verifier is the gate for each task.

---

## Run It

ES modules need HTTP, so opening `index.html` via `file://` won't work.

```bash
npm start            # serves on http://127.0.0.1:8089
npm test             # node tests/verify_chrono.js
```

Any static server works too (`python -m http.server`, `npx serve .`). Audio starts after your first click, tap or key press, as browsers require.

## Project Layout

```
index.html                 both apps, canvas renderers, graph, audio, hash sync
src/core/fsm-engine.js     the engine (runtime source of truth)
src/core/fsm-engine.ts     typed twin with identical logic and API
tests/verify_chrono.js     engine unit checks and structural invariants
.kiro/specs/chrono-fsm/    requirements, design, tasks, visual spec
```

## Verification

`tests/verify_chrono.js` checks the engine (50/50 distribution over 200 trials, hash round-trip) and static invariants of `index.html` (engine import, both apps, canvases, animation loop). It does not drive a browser, so the visuals and audio were checked by hand.

Requires Node 22+ (the verifier `require()`s the ESM engine file).

## License

MIT