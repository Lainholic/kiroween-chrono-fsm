// Web Audio synthesis for PARK.EXE. No DOM/global references: the AudioContext
// constructor and timer functions are injected. No audio files are loaded.

const CLEANUP_MARGIN_MS = 400;

export function createAudio({ AudioContextCtor, setTimeout, clearTimeout } = {}) {
  let ctx = null;
  let master = null;
  let unlocked = false;
  let muted = false;
  let noiseBuffer = null;
  const groups = new Set(); // active playbacks: { nodes, sources, timer }

  function safe(fn) {
    try { return fn(); } catch { return undefined; }
  }

  function getNoise() {
    if (noiseBuffer) return noiseBuffer;
    const rate = ctx.sampleRate || 44100;
    const len = Math.max(1, Math.floor(rate * 0.1));
    const buf = ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    let s = 12345; // deterministic LCG noise (no Math.random)
    for (let i = 0; i < len; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      data[i] = (s / 4294967296) * 2 - 1;
    }
    noiseBuffer = buf;
    return buf;
  }

  function dispose(group) {
    if (!groups.delete(group)) return;
    if (group.timer != null) safe(() => clearTimeout(group.timer));
    group.timer = null;
    for (const src of group.sources) safe(() => src.stop());
    for (const n of group.nodes) safe(() => n.disconnect());
    group.nodes.length = 0;
    group.sources.length = 0;
  }

  function newGroup() {
    const group = { nodes: [], sources: [], timer: null };
    const track = (n, isSource) => {
      group.nodes.push(n);
      if (isSource) group.sources.push(n);
      return n;
    };
    return { group, track };
  }

  function schedule(group, endSec) {
    groups.add(group);
    group.timer = setTimeout(() => dispose(group), Math.ceil(endSec * 1000) + CLEANUP_MARGIN_MS);
  }

  // Oscillator burst with exponential-ish decay envelope, routed to master.
  function tone(track, t, dur, hz0, hz1, gain, type) {
    const osc = track(ctx.createOscillator(), true);
    const g = track(ctx.createGain(), false);
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(hz0, t);
    if (hz1 !== hz0) osc.frequency.linearRampToValueAtTime(hz1, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Filtered noise burst.
  function noise(track, t, dur, filterType, hz, gain) {
    const src = track(ctx.createBufferSource(), true);
    const f = track(ctx.createBiquadFilter(), false);
    const g = track(ctx.createGain(), false);
    src.buffer = getNoise();
    src.loop = true;
    f.type = filterType;
    f.frequency.setValueAtTime(hz, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  function num(v, d) { return Number.isFinite(v) ? v : d; }

  function unlock() {
    try {
      if (!ctx) {
        if (typeof AudioContextCtor !== 'function') return;
        ctx = new AudioContextCtor();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.5;
        master.connect(ctx.destination);
      }
      unlocked = true;
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch {
      ctx = null;
      master = null;
      unlocked = false;
    }
  }

  function playSeek(plan) {
    if (!unlocked || muted || !ctx || !plan) return;
    const { group, track } = newGroup();
    try {
      const t0 = num(ctx.currentTime, 0) + 0.02;
      const duration = num(plan.duration, 2.4);
      const m = plan.motor || {};
      const mt0 = num(m.t0, 0);
      const mt1 = num(m.t1, duration);
      tone(track, t0 + mt0, Math.max(0.05, mt1 - mt0), num(m.startHz, 180), num(m.endHz, 40), 0.35, 'sawtooth');
      for (const s of plan.seeks || []) {
        const t = t0 + num(s.t, 0);
        const g = num(s.gain, 0.3);
        tone(track, t, 0.025, num(s.hz, 800), num(s.hz, 800) * 0.6, g, 'square');
        noise(track, t, 0.02, 'bandpass', 2500, g * 0.6);
      }
      if (plan.latch) {
        const t = t0 + num(plan.latch.t, duration);
        const g = num(plan.latch.gain, 0.5);
        tone(track, t, 0.08, num(plan.latch.hz, 250), 90, g, 'triangle');
        noise(track, t, 0.07, 'lowpass', 400, g);
      }
      schedule(group, duration + 0.02);
    } catch {
      dispose(group);
      // dispose() ignores groups never scheduled; clean up directly.
      for (const src of group.sources) safe(() => src.stop());
      for (const n of group.nodes) safe(() => n.disconnect());
      group.nodes.length = 0;
      group.sources.length = 0;
    }
  }

  function sfx(name) {
    if (!unlocked || muted || !ctx) return;
    const { group, track } = newGroup();
    try {
      const t = num(ctx.currentTime, 0) + 0.01;
      let end;
      if (name === 'stamp') {
        tone(track, t, 0.12, 140, 60, 0.6, 'triangle');
        noise(track, t, 0.06, 'lowpass', 600, 0.5);
        end = 0.14;
      } else if (name === 'blip') {
        tone(track, t, 0.06, 880, 880, 0.25, 'square');
        end = 0.08;
      } else if (name === 'copy') {
        tone(track, t, 0.05, 300, 200, 0.2, 'square');
        noise(track, t, 0.05, 'bandpass', 1800, 0.25);
        tone(track, t + 0.09, 0.05, 260, 180, 0.2, 'square');
        noise(track, t + 0.09, 0.05, 'bandpass', 1800, 0.25);
        end = 0.16;
      } else {
        return;
      }
      schedule(group, end);
    } catch {
      for (const src of group.sources) safe(() => src.stop());
      for (const n of group.nodes) safe(() => n.disconnect());
      group.nodes.length = 0;
      group.sources.length = 0;
    }
  }

  function setMuted(on) {
    muted = !!on;
    if (!master) return;
    if (muted) {
      safe(() => {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(0, ctx.currentTime);
      });
      safe(() => { master.gain.value = 0; });
      for (const group of Array.from(groups)) dispose(group);
    } else {
      safe(() => { master.gain.value = 0.5; });
    }
  }

  return { unlock, playSeek, sfx, setMuted, isUnlocked: () => unlocked };
}
