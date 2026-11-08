---
inclusion: fileMatch
fileMatchPattern: "src/core/*"
---
# Engine rules

- Never put app-specific logic (clock, box, canvas, audio, DOM) in the engine.
- New behavior for an app belongs in its schema (`onEnter`, `action`, `guard`, `timeout`) or in UI code that listens via `onStateChange`.
- `fsm-engine.js` is the source of truth. After any change, mirror it in `fsm-engine.ts` (logic identical, types allowed to differ).
- Probabilistic branching is expressed as several transitions on the same event with `probability` weights, never as `Math.random()` in the UI.
- Run `node tests/verify_chrono.js` after every engine change.