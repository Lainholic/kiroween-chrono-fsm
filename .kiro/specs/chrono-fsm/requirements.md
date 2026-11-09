# Requirements: Chrono-FSM (Skeleton Crew Track)

## 1. Executive Summary & Concept
- **Goal**: Demonstrate that a single Finite State Machine core with zero external runtime dependencies (pure vanilla JS, Canvas 2D, Web Audio API) (`src/core/fsm-engine.js` / `fsm-engine.ts`) can cleanly power two radically different applications without any modification to the engine logic.
- **Track**: Kiroween 2026 - Skeleton Crew ("Build a clean, flexible skeleton code template and demonstrate its versatility by powering two distinct applications").
- **App 1**: **Neon Smart Focus Clock** (Productivity Pomodoro, deep work timer, break interval alert).
- **App 2**: **Halloween Jack-in-the-Box** (Spooky crank music box, tension accumulation, 50/50 Treat or Trick pop trigger with jumpscare & treats).
- **App 3**: **Haunted Vending Machine** (Coin credit guard, weighted 60/25/15 outcome, jam recovery by kicking, auto-timeouts). Added with zero engine changes to prove the skeleton generalizes.

---

## 2. Functional Requirements (EARS Format)

### 2.1 Core FSM Engine Requirements
- **REQ-CORE-01**: **WHEN** an event is dispatched via `send(event, payload)`, the engine **SHALL** evaluate transitions and guard conditions to transition to the target state.
- **REQ-CORE-02**: **WHEN** multiple transitions match an event with probability weights, the engine **SHALL** execute probabilistic branching (e.g. 50% Treat vs 50% Trick).
- **REQ-CORE-03**: **WHEN** a state defines a `timeout`, the engine **SHALL** automatically trigger transition to `targetState` after `durationMs` elapses, while clearing the timer if another event intervenes.
- **REQ-CORE-04**: **WHEN** `toHashString()` is called, the engine **SHALL** serialize the current state and context into a URL hash; and `fromHashString()` **SHALL** restore the state without loss.

### 2.2 App 1: Neon Smart Focus Clock Requirements
- **REQ-CLK-01**: **WHEN** the user clicks "Start Focus", the FSM **SHALL** transition `IDLE -> FOCUSING` and tick down remaining seconds.
- **REQ-CLK-02**: **WHEN** the user clicks "Pause", the FSM **SHALL** transition `FOCUSING -> PAUSED`, freeze the timer, and preserve elapsed time.
- **REQ-CLK-03**: **WHEN** the focus duration expires (or is triggered), the FSM **SHALL** transition `FOCUSING -> BREAK` and emit a chime audio tone.
- **REQ-CLK-04**: **WHEN** "Reset" is clicked, the FSM **SHALL** transition back to `IDLE` with default 25:00 restored.

### 2.3 App 2: Halloween Jack-in-the-Box (50/50 Treat or Trick) Requirements
- **REQ-BOX-01**: The box **SHALL** start in the `IDLE` (Closed) state with tension level 0.
- **REQ-BOX-02**: **WHEN** the crank handle is turned, the FSM **SHALL** advance tension:
  - First crank: `IDLE -> WINDING_1` (Audio click pitch 1).
  - Second crank: `WINDING_1 -> WINDING_2` (Audio click pitch 2, box wobble increases).
  - Third crank: `WINDING_2 -> READY_TO_POP` (High-tension warning, button transforms to "TRIGGER POP!").
- **REQ-BOX-03**: **WHEN** the pop trigger is pressed from `READY_TO_POP`:
  - 50% probability: Transition to `POPPED_TREAT` (Happy Pumpkin 🎃, sweet harmonic chime, candy confetti message).
  - 50% probability: Transition to `POPPED_TRICK` (Scary Phantom 👻, screen shake animation, spooky low screech audio).
- **REQ-BOX-04**: **WHEN** "Close Box" is clicked, the FSM **SHALL** transition back to `IDLE` and reset the crank state.

### 2.4 App 3: Haunted Vending Machine Requirements
- **REQ-VND-01**: The machine **SHALL** start in `IDLE` with 0 coins. **WHEN** a coin is inserted, the FSM **SHALL** transition `IDLE -> HAS_COIN`; further coins **SHALL** add credit up to a maximum of 3.
- **REQ-VND-02**: **WHEN** a slot (A, B or C) is selected, the engine **SHALL** accept the event only if credit is at least 2 coins (guard). Otherwise `send()` **SHALL** return `false` and the UI **SHALL** explain that credit is missing.
- **REQ-VND-03**: **WHEN** a slot is selected with enough credit, the engine **SHALL** branch probabilistically: 60% `DISPENSED`, 25% `JAMMED`, 15% `HAUNTED`.
- **REQ-VND-04**: **WHEN** the machine is `JAMMED` and the user kicks it, the engine **SHALL** branch 40% `DISPENSED` and 60% back to `JAMMED` (self transition).
- **REQ-VND-05**: **WHEN** `HAS_COIN` idles for 20 s, `DISPENSED` for 8 s or `HAUNTED` for 4.5 s, the engine **SHALL** return to `IDLE` through a state timeout.
- **REQ-VND-06**: The app **SHALL** use the same unmodified `src/core/fsm-engine.js` as Apps 1 and 2. Its state **SHALL** appear in the live node graph and round-trip through the URL hash (`#app=vend`).

### 2.5 Architecture & Zero-Bit URL Hash Requirements
- **REQ-SYS-01**: All three apps **SHALL** import and instantiate `FsmEngine` from `./src/core/fsm-engine.js` via an ES module import, sharing zero global mock variables.
- **REQ-SYS-02**: The UI **SHALL** reflect the active state machine's state in real-time badges and display live state history.
- **REQ-SYS-03**: The app **SHALL** support URL hash synchronization (`#app=<clock|box|vend>&d=<base64 snapshot>`) to restore session state across page refreshes.
