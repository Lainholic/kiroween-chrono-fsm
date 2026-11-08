# Visual Polish & High-End Rendering Specification: Chrono-FSM

> **Target**: Elevate Chrono-FSM from a basic functional PoC (35%) to an award-winning, visually stunning product (90%+) for Kiroween 2026 (Skeleton Crew Track).

---

## 1. App 1: Cyberpunk Neon Focus Clock (Canvas 2D Engine)

### 1.1 Requirements & Specifications
- **Remove Plain Text Timer**: Replace the raw `<div>25:00</div>` with an interactive, high-definition **HTML5 Canvas 2D Circular Gauge** (`<canvas id="clock-canvas">`, 360x360).
- **Circular Neon Arc (60 FPS)**:
  - Outer background track with faint dark-cyan glow (`rgba(102, 252, 241, 0.15)`).
  - Active countdown progress arc with multi-pass neon blur (`ctx.shadowBlur = 15~25`, `ctx.shadowColor = '#66fcf1'`).
  - Progress angle smoothly interpolates based on remaining seconds: $\theta = 2\pi \times \frac{\text{remaining}}{\text{total}}$.
- **Breathing Pulse in FOCUSING State**:
  - The neon arc and center timer text pulsate smoothly using a sinusoidal breathing cycle ($1.5\text{Hz}$):
    $$\alpha(t) = 0.8 + 0.2 \times \sin(t \times 3.0)$$
- **Oscilloscope Waveform (Focus Energy)**:
  - Beneath the clock, render a live oscilloscope sine waveform representing mental focus flow.
  - While `FOCUSING`, the wave flows rapidly with cybernetic spikes.
  - While `PAUSED`, the wave flattens into a calm standby line.
  - While `BREAK`, the color shifts to refreshing emerald green (`#55ff99`).

---

## 2. App 2: Spooky Jack-in-the-Box (Procedural Mechanical Canvas)

### 2.1 Requirements & Specifications
- **Remove Raw Emojis**: Replace static emoji icons (📦, 🎃, 👻) with an animated, procedural Canvas 2D mechanical music box (`<canvas id="box-canvas">`, 360x360).
- **Mechanical Box & Crank Wobble**:
  - Render an ornate gothic Halloween box with brass hinges, purple velvet body, and an orange crank lever.
  - **Winding Tension Physics**:
    - `IDLE`: Calm box, gentle idling sway.
    - `WINDING_1`: Crank rotates 360 degrees. Slight horizontal vibration ($\pm 2\text{px}$).
    - `WINDING_2`: Crank rotates faster. Rapid tension wobble ($\pm 5\text{px}$) with small puff particles emitting from seams.
    - `READY_TO_POP`: Violent shaking ($\pm 8\text{px}$), glowing orange seams with escaping light beams.
- **The Pop Explosion (Particle Physics)**:
  - When `POP` fires:
    - Box lid flips open dramatically with spring recoil.
  - **Outcome 1: POPPED_TREAT (50% Chance)**:
    - A glowing, smiling 2D neon Pumpkin pops up on an elastic spring coil.
    - **Particle Burst**: 60+ colorful candy confetti and golden spark particles explode upward with gravity, rotation, and fading alpha.
    - Background flash: Warm golden-orange radiance.
  - **Outcome 2: POPPED_TRICK (50% Chance)**:
    - A terrifying neon Phantom screamer thrusts forward toward the camera.
    - **Glitch & Lightning Effect**: Screen chromatic aberration / red flash with 40+ blood-red ember particles scattering downwards.
    - Full screen shake intensity.

---

## 3. Real-Time Interactive FSM Node Graph Visualizer

### 3.1 Requirements & Specifications
- Beneath the main stage, render an **Interactive FSM Node Graph** (`<canvas id="fsm-graph-canvas">`, 580x110).
- **Node Representation**:
  - Render each state in the active schema as a circular neon node with its state label.
  - Connecting edges (arrows) represent valid transitions.
- **Active State Highlighting**:
  - The node corresponding to `engine.getCurrentState()` glows intensely with a rotating halo ring.
- **Transition Pulse Effect**:
  - Whenever `engine.send(event)` triggers a transition, a glowing energy pulse packet travels along the edge from the previous node to the new target node.
- **Judge Impact**: Visually proves to the hackathon judges that a single, pure deterministic FSM engine is orchestrating the entire lifecycle in real time.

---

## 4. Performance & Audio Integration
- **Lock to 60 FPS**: Unified `requestAnimationFrame` loop driving clock, box, and FSM graph canvas contexts.
- **Audio Synchronization**: Web Audio clicks, chimes, and screechers perfectly sync with particle burst triggers.
- **Zero External Dependencies**: Pure native Canvas 2D and Web Audio API. Zero external image assets or heavy bundles.
