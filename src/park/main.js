// PARK.EXE DOM glue. [dom] module: wires input, audio unlock, visibility and resize
// to the pure modules. Auto-runs on import. The phase FSM (BOOT/PARKING/CRT_ON/OFFICE)
// is the shared FsmEngine; all app-specific side effects live in its onStateChange listener.
import { FsmEngine } from '../core/fsm-engine.js';
import { createAppSchema } from './schemas.js';
import { createRng } from './rng.js';
import { createBootModel } from './boot.js';
import { createLoop } from './loop.js';
import { createSimulation } from './sim.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { planSeekSound } from './audio-plan.js';
import { shakeOffset, rollOffset, crtOnProgress } from './scene-math.js';
import { CRT_ON_MS } from './constants.js';

const canvas = document.getElementById('park-canvas');
if (!canvas) throw new Error('PARK.EXE: #park-canvas not found');

// Non-deterministic seed (Math.random is never used directly).
const nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
const rng = createRng((Date.now() ^ Math.floor(nowMs * 1000)) >>> 0);

const renderer = createRenderer(canvas);
const audio = createAudio({
  AudioContextCtor: window.AudioContext || window.webkitAudioContext,
  setTimeout: window.setTimeout.bind(window),
  clearTimeout: window.clearTimeout.bind(window),
});

// The same plan sets PARKING's duration and is the one played (Req 2.5, 2.7).
const seekPlan = planSeekSound(rng);
const phase = new FsmEngine(createAppSchema({
  seekMs: Math.round(seekPlan.duration * 1000),
  crtOnMs: CRT_ON_MS,
}));

let boot = createBootModel();
let sim = null;
let loop = null;       // the single active rAF loop
let bootT = 0;         // boot screen animation clock (cursor blink)
let phaseElapsed = 0;  // seconds spent in PARKING / CRT_ON
let lastBossState = null;

const raf = (cb) => window.requestAnimationFrame(cb);
const caf = (h) => window.cancelAnimationFrame(h);

function setLoop(onFrame) {
  if (loop) loop.stop();
  loop = createLoop({ raf, caf, onFrame });
  loop.start();
  if (document.hidden) loop.pause();
}

function stopLoop() {
  if (loop) loop.stop();
  loop = null;
}

// ---------------------------------------------------------------- phase loops
function startBootLoop() {
  bootT = 0;
  setLoop((dt) => {
    bootT += dt;
    boot.update(dt);
    renderer.drawBoot(boot, { t: bootT });
  });
}

function startParkingLoop() {
  phaseElapsed = 0;
  setLoop((dt) => {
    phaseElapsed += dt;
    bootT += dt;
    const s = shakeOffset(rng);
    renderer.drawBoot(boot, { t: bootT, dx: s.dx, dy: s.dy, roll: rollOffset(phaseElapsed) });
  });
}

function startCrtOnLoop() {
  // Create the simulation first and draw one office frame so drawCrtOn has its source.
  sim = createSimulation({ rng });
  lastBossState = sim.agents.boss.engine.getCurrentState();
  renderer.drawOffice(sim, 0);
  phaseElapsed = 0;
  setLoop((dt) => {
    phaseElapsed += dt;
    renderer.drawCrtOn(crtOnProgress(phaseElapsed * 1000, CRT_ON_MS));
  });
}

function startOfficeLoop() {
  setLoop((dt) => {
    sim.update(dt);
    const bossState = sim.agents.boss.engine.getCurrentState();
    if (bossState !== lastBossState) {
      if (bossState === 'STAMP_APPROVE' || bossState === 'STAMP_REJECT') audio.sfx('stamp');
      lastBossState = bossState;
    }
    renderer.drawOffice(sim, sim.time);
  });
}

// ---------------------------------------------------------------- phase listener
// Signature: (current, previous, context, event).
phase.onStateChange((current, previous) => {
  if (current === previous) return;
  if (current === 'BOOT') {
    if (sim) { sim.destroy(); sim = null; }
    stopLoop();
    boot = createBootModel();
    startBootLoop();
  } else if (current === 'PARKING') {
    audio.playSeek(seekPlan);
    startParkingLoop();
  } else if (current === 'CRT_ON') {
    startCrtOnLoop();
  } else if (current === 'OFFICE') {
    startOfficeLoop();
  }
});

// ---------------------------------------------------------------- input
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock']);

function onKeyDown(e) {
  const state = phase.getCurrentState();
  if (state === 'BOOT') {
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // leave browser shortcuts alone
    if (e.key === 'Enter') {
      e.preventDefault();
      if (boot.enter().action === 'PARK') phase.send('PARK');
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      boot.backspace();
    } else if (typeof e.key === 'string' && e.key.length === 1) {
      e.preventDefault();
      boot.typeChar(e.key);
    }
  } else if (state === 'OFFICE') {
    if (MODIFIER_KEYS.has(e.key)) return;
    // Design choice: M toggles mute only in OFFICE. In BOOT 'm' is ordinary typed text
    // (e.g. "PARK.EXE" style commands), and PARKING/CRT_ON ignore input entirely.
    if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      muted = !muted;
      audio.setMuted(muted);
      return;
    }
    e.preventDefault();
    phase.send('EXIT');
  }
  // PARKING / CRT_ON: ignored, no duplicate sequences (Req 1.9, 3.8).
}

function onPointerDown() {
  const state = phase.getCurrentState();
  if (state === 'BOOT') {
    if (boot.pointer().action === 'PARK') phase.send('PARK');
  } else if (state === 'OFFICE') {
    phase.send('EXIT');
  }
}

let muted = false;

// Audio unlock: the only place an AudioContext gets created (via audio.unlock()).
for (const evt of ['pointerdown', 'keydown', 'touchstart']) {
  window.addEventListener(evt, () => audio.unlock(), { capture: true, passive: true });
}
window.addEventListener('keydown', onKeyDown);
window.addEventListener('pointerdown', onPointerDown);

document.addEventListener('visibilitychange', () => {
  if (!loop) return;
  if (document.hidden) loop.pause();
  else loop.resume();
});

function onResize() {
  renderer.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
onResize();

// The engine entered BOOT in its constructor, before the listener existed.
startBootLoop();
