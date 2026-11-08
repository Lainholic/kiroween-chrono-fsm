# Chrono-FSM: One Core, Three Apps

> Submission text for Kiroween 2026, Skeleton Crew track. The numbers below match this repository.

## Tagline

One pure finite state machine engine, about 150 lines and zero dependencies, driving a neon focus timer, a Halloween jack-in-the-box and a haunted vending machine with zero engine modifications.

## Links

- Live demo: https://lainholic.github.io/kiroween-chrono-fsm/
- Source code: https://github.com/Lainholic/kiroween-chrono-fsm
- Demo video: https://youtu.be/vLiqAHuznxU
- Public Blog Post (Bonus): https://blog.naver.com/lvalways/224469509777
- Social Post (X): https://x.com/LainHolic/status/2119406087820714488

## Inspiration

The Skeleton Crew track asks for a clean, flexible skeleton that proves its versatility by powering distinct applications. A finite state machine is the most honest skeleton we could think of. Timers, game props and vending machines all look different, but underneath they are the same thing: states, events, rules about which events are allowed, and sometimes a dice roll.

So we set ourselves one rule: build the engine once, then build different apps on top of it without ever editing the engine again.

## What it does

Three apps share one engine file, `src/core/fsm-engine.js`. Each app is only a schema (a plain object describing states and transitions) plus a UI that listens to state changes.

**App 1: Neon Focus Clock.** A 25 minute focus timer on a Canvas 2D neon arc gauge. The ring breathes while you focus, an oscilloscope waveform runs underneath, and a chime plays when the session ends. States: `IDLE`, `FOCUSING`, `PAUSED`, `BREAK`.

**App 2: Halloween Jack-in-the-Box.** Crank the handle three times to build tension, then pull the trigger. The outcome is a true 50/50 branch decided by the engine: a pumpkin with a candy confetti burst (Treat), or a lunging phantom with lightning, glitch and screen shake (Trick).

**App 3: Haunted Vending Machine.** Insert two coins, pick a slot, and the engine rolls 60% dispense, 25% jam, 15% haunted. Selecting without enough credit is rejected by an engine guard. A jammed machine can be kicked, which frees the item 40% of the time and otherwise loops back to jammed.

Below the apps, a **live FSM node graph** draws the active schema as nodes and edges, haloes the current state and sends an energy packet along each transition. It is generated from the same schema objects the engine runs.

**0-Bit URL persistence.** The whole machine state is encoded into the URL hash (`#app=vend&d=...`). Copy the link mid-crank or with a jammed machine and the recipient lands in the same state. No backend, no storage.

## How we built it

**The engine.** A zero-dependency ES module with deterministic transitions, guards, lifecycle hooks, state timeouts, weighted probabilistic branching, a state history, and base64 snapshot save and restore. A typed TypeScript twin (`fsm-engine.ts`) keeps identical runtime logic.

**The apps.** Everything is hand-written Canvas 2D and the Web Audio API: no frameworks, no image assets, no audio files. Four canvases share one `requestAnimationFrame` loop with a shared particle system. Sound is synthesized with oscillators, and the audio context only starts after the first user gesture.

**Built with Kiro.** We used three Kiro features together:
- **Specs:** requirements in EARS format, a design document with the three FSM schemas, and a task list the agent worked through and ticked off. App 3 followed the same loop: requirements and schema design first, implementation second.
- **Steering:** a project overview that is always loaded and an engine rules file scoped to `src/core/`, which forbids app-specific logic in the engine. A manual steering entry mirroring the verify hook also appeared in `.kiro/steering/` after we ran that hook from the IDE.
- **Hooks:** a manual "Verify Chrono-FSM" hook that runs the verifier (we ran it from the IDE), and an "Engine Sync Check" hook that is set to fire when the engine file is saved.

**Verification.** `tests/verify_chrono.js` runs 31 checks. Eleven of them cover App 3. Most extract the vending schema from `index.html` and run it on the real engine: guard rejections, the 60/25/15 distribution over 600 trials, recovery by kicking, the timeout configuration and the hash round trip. One check confirms the engine file contains no clock, box, vending, canvas or audio code. A GitHub Actions workflow runs the verifier before every deploy to GitHub Pages.

## Challenges we ran into

- **Keeping the engine untouched.** The vending machine needed things the first two apps barely used: a guard that rejects an event, a transition from a state to itself, and three weighted outcomes. All of it fit into the existing engine features. The only extra work was in the graph visualizer, which had to learn to draw a self-transition loop.
- **Probability belongs in the engine, not the UI.** It is tempting to call `Math.random()` in a button handler. We expressed every dice roll as several transitions on the same event with probability weights, so the behavior is testable without a browser.
- **A timer that lies in the background.** The first clock counted one tick per second, which runs slow when a browser throttles a background tab or the laptop sleeps. We found this while reviewing the code and changed the countdown to follow the real clock. We checked the fix with a simulated throttled timer (a ten minute gap with a single tick still lands on the correct remaining time); we did not run a real multi-minute background-tab test.
- **Autoplay rules.** Browsers block audio before a user gesture, and a state restored from a link can start a ticking clock with no click. Sound now unlocks on the first pointer, key or touch event and stays silent until then.
- **Honest numbers.** While writing the docs we miscounted the verifier's checks once, because the summary line also contains the word PASS. We corrected the README and now state 31 checks.

## Accomplishments that we're proud of

- The engine file has zero changes since the first commit, while three different apps run on it. The repository history shows it.
- The 50/50 and 60/25/15 outcomes are decided by the engine and verified statistically (200 and 600 trials).
- A jammed machine, a half-cranked box or a running timer can be shared as a plain URL.
- A complete spec-driven trail: requirements, design, tasks, steering and hooks are all committed in `.kiro/`.
- A fully procedural look with no assets: a mechanical music box, a vending machine with falling items and ghosts, and a neon gauge, all drawn in code.

## What we learned

A good skeleton is mostly about what it refuses to know. The engine knows nothing about clocks, boxes or vending machines, and that is exactly why a third app cost us no engine changes. We also learned that the cheapest way to keep a claim like "zero modifications" honest is to turn it into a check that fails when it stops being true.

## What's next

- Browser-driven tests (a headless browser) so the visuals, audio unlock and tab flow are verified automatically, not just the engine logic.
- A live schema editor: edit the JSON schema on the page and watch the engine and node graph change instantly.
- Compensating for time spent away when a running timer is restored from a shared link.
- Mobile layout, a reduced-motion mode and a stricter TypeScript type check.
- Migrating the hooks to the newer Kiro hook format.
- More apps on the same skeleton.

## Built with

JavaScript (ES modules), TypeScript, HTML5 Canvas 2D, Web Audio API, Node.js (verification), GitHub Pages, GitHub Actions, Kiro (specs, steering, hooks).