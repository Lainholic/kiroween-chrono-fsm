// Seek_Sound plan. Pure module: no DOM, window, or canvas references.
// Invariants hold for ANY rng output (including NaN / out-of-range values).

const DURATION = 2.4;
const MIN_GAP = 0.020;
const JITTER = 0.03;
const BASE_SEEKS = [0.20, 0.45, 0.62, 0.95, 1.10, 1.38, 1.62, 1.85];
const LATCH_BASE = 2.05;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function planSeekSound(rng) {
  const draw = () => {
    let v;
    try { v = typeof rng === 'function' ? rng() : 0.5; } catch { v = 0.5; }
    return Number.isFinite(v) ? clamp(v, 0, 1) : 0.5;
  };
  const jitter = () => (draw() * 2 - 1) * JITTER;

  const duration = DURATION;
  const motor = { startHz: 180, endHz: 40, t0: 0, t1: 2.0 };

  // Jitter, clamp, sort, then enforce minimum gap by pushing later clicks forward.
  const times = BASE_SEEKS.map((b) => clamp(b + jitter(), 0.05, 1.9)).sort((a, b) => a - b);
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] < MIN_GAP) times[i] = times[i - 1] + MIN_GAP;
  }
  const seeks = times.map((t) => ({
    t,
    hz: 600 + draw() * 600,
    gain: 0.25 + draw() * 0.15,
  }));

  const last = seeks[seeks.length - 1].t;
  const latchT = clamp(Math.max(LATCH_BASE + jitter(), last + MIN_GAP), 0, duration);
  const latch = { t: latchT, hz: 220 + draw() * 80, gain: 0.5 };

  return { duration, motor, seeks, latch };
}
