# Technical Design: Chrono-FSM Architecture

## 1. System Architecture

```mermaid
graph TD
    Engine[src/core/fsm-engine.js<br/>FsmEngine Class] -->|State Events & Transitions| ClockApp[App 1: Neon Smart Clock]
    Engine -->|State Events & Transitions| BoxApp[App 2: Spooky Jack-in-the-Box]
    Engine -->|State Events & Transitions| VendApp[App 3: Haunted Vending Machine]
    
    ClockApp --> UI[index.html UI View]
    BoxApp --> UI
    VendApp --> UI
    
    Engine <-->|0-Bit URL Hash Base64| HashRouter[window.location.hash]
    UI -->|Web Audio API| Synth[Sound Synthesizer Oscillator]
```

---

## 2. State Machine Schemas

### 2.1 Clock FSM Schema
```typescript
const clockSchema = {
  id: "neon-clock",
  name: "Neon Focus Clock",
  initialState: "IDLE",
  context: { remainingSeconds: 1500, cycleCount: 0 },
  states: {
    IDLE: {
      transitions: [{ event: "START", target: "FOCUSING" }]
    },
    FOCUSING: {
      transitions: [
        { event: "PAUSE", target: "PAUSED" },
        { event: "EXPIRE", target: "BREAK" },
        { event: "RESET", target: "IDLE" }
      ]
    },
    PAUSED: {
      transitions: [
        { event: "RESUME", target: "FOCUSING" },
        { event: "RESET", target: "IDLE" }
      ]
    },
    BREAK: {
      transitions: [
        { event: "START", target: "FOCUSING" },
        { event: "RESET", target: "IDLE" }
      ]
    }
  }
};
```

### 2.2 Spooky Jack-in-the-Box FSM Schema (50/50 Probabilistic)
```typescript
const boxSchema = {
  id: "spooky-box",
  name: "Halloween Jack-in-the-Box",
  initialState: "IDLE",
  context: { cranks: 0, outcome: null },
  states: {
    IDLE: {
      transitions: [{ event: "CRANK", target: "WINDING_1" }]
    },
    WINDING_1: {
      transitions: [
        { event: "CRANK", target: "WINDING_2" },
        { event: "RESET", target: "IDLE" }
      ],
      timeout: { durationMs: 15000, targetState: "IDLE" }
    },
    WINDING_2: {
      transitions: [
        { event: "CRANK", target: "READY_TO_POP" },
        { event: "RESET", target: "IDLE" }
      ],
      timeout: { durationMs: 15000, targetState: "IDLE" }
    },
    READY_TO_POP: {
      transitions: [
        {
          event: "POP",
          target: "POPPED_TREAT",
          probability: 0.50,
          action: (ctx) => { ctx.outcome = "TREAT"; }
        },
        {
          event: "POP",
          target: "POPPED_TRICK",
          probability: 0.50,
          action: (ctx) => { ctx.outcome = "TRICK"; }
        },
        { event: "RESET", target: "IDLE" }
      ]
    },
    POPPED_TREAT: {
      transitions: [{ event: "RESET", target: "IDLE" }]
    },
    POPPED_TRICK: {
      transitions: [{ event: "RESET", target: "IDLE" }]
    }
  }
};
```

### 2.3 Haunted Vending Machine FSM Schema (guards + weighted outcomes + self transition)
```typescript
const vendSchema = {
  id: "haunted-vending",
  initialState: "IDLE",
  context: { coins: 0, slot: null, kicks: 0 },
  states: {
    IDLE:      { transitions: [{ event: "COIN", target: "HAS_COIN" }] },
    HAS_COIN:  {
      transitions: [
        { event: "COIN",   target: "HAS_COIN", guard: (c) => c.coins < 3 },
        { event: "SELECT", target: "DISPENSED", probability: 0.60, guard: (c) => c.coins >= 2 },
        { event: "SELECT", target: "JAMMED",    probability: 0.25, guard: (c) => c.coins >= 2 },
        { event: "SELECT", target: "HAUNTED",   probability: 0.15, guard: (c) => c.coins >= 2 },
        { event: "RESET",  target: "IDLE" }
      ],
      timeout: { durationMs: 20000, targetState: "IDLE" }
    },
    DISPENSED: { transitions: [{ event: "TAKE", target: "IDLE" }], timeout: { durationMs: 8000, targetState: "IDLE" } },
    JAMMED:    { transitions: [
        { event: "KICK", target: "DISPENSED", probability: 0.40 },
        { event: "KICK", target: "JAMMED",    probability: 0.60 },   // self transition
        { event: "RESET", target: "IDLE" } ] },
    HAUNTED:   { transitions: [{ event: "RESET", target: "IDLE" }], timeout: { durationMs: 4500, targetState: "IDLE" } }
  }
};
```
The marker comments `// <schema:vending>` in `index.html` let the verifier extract this schema and test it against the real engine.

---

## 3. UI/UX Interaction & Web Audio Design

1. **Neon Focus Clock**:
   - Cyan glowing 7-segment/monospace numbers (`#66fcf1`).
   - Clean Start / Pause / Reset button controls.
   - 440Hz triangle work tone, 880Hz chime for break.
2. **Jack-in-the-Box**:
   - Retro mechanical music box frame.
   - Crank rotation angle increases with tension:
     - `WINDING_1`: $\pm 10^\circ$, Sawtooth click (240Hz).
     - `WINDING_2`: $\pm 20^\circ$, Sawtooth click (360Hz).
     - `READY_TO_POP`: Pulsing glow, Warning beep (480Hz).
     - `POPPED_TREAT`: Major Triad Chime (C5, E5, G5).
     - `POPPED_TRICK`: Jumpscare low sawtooth screech (110Hz $\rightarrow$ 60Hz drop) + visual screen shake.
3. **Haunted Vending Machine** (`vend-canvas`, 360x360 Canvas 2D):
   - Neon-trimmed machine with glass window, 3x2 candy / skull / potion shelves, LCD credit display, coin slot with falling coin, A/B/C buttons, dispensing bay.
   - `DISPENSED`: selected item drops with gravity and bounces in the bay, small candy burst, clunk + chime.
   - `JAMMED`: item hangs tilted, red lamp blinks, machine shakes on every kick, buzzer and thud.
   - `HAUNTED`: lights flicker, a phantom face appears in the glass, items rattle and levitate, green wisps and eyes in the bay, low moan.
4. **0-Bit URL Hash Integration**:
   - Every state transition synchronizes with `window.location.hash`.
   - On page load, if a valid hash exists, state machine instantly restores.
