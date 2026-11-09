// PARK.EXE screen/scene math. Pure module: no DOM, window, or canvas references.

import {
  LOGICAL_W,
  LOGICAL_H,
  SHAKE_MAX_PX,
  ROLL_PER_SEC,
  COPIER_SCAN_PERIOD_SEC
} from './constants.js';

/** Largest integer scale (>= 1) that fits the logical screen in the viewport (Req 3.4, 3.7). */
export function computeScale(vw, vh) {
  const s = Math.floor(Math.min(vw / LOGICAL_W, vh / LOGICAL_H));
  return Number.isFinite(s) && s >= 1 ? s : 1;
}

/** Integer shake offset, each axis within [-SHAKE_MAX_PX, SHAKE_MAX_PX] (Req 3.1). */
export function shakeOffset(rng) {
  const span = 2 * SHAKE_MAX_PX + 1;
  const pick = () => {
    const v = Math.floor(rng() * span) - SHAKE_MAX_PX;
    return Math.max(-SHAKE_MAX_PX, Math.min(SHAKE_MAX_PX, v));
  };
  return { dx: pick(), dy: pick() };
}

/** Vertical roll offset in [0, h), advancing `rate` full screens per second (Req 3.1). */
export function rollOffset(tSec, h = LOGICAL_H, rate = ROLL_PER_SEC) {
  const raw = tSec * rate * h;
  const off = ((raw % h) + h) % h;
  return off >= h || !Number.isFinite(off) ? 0 : off;
}

/** CRT power-on progress in [0, 1], monotonic non-decreasing in tMs (Req 3.2). */
export function crtOnProgress(tMs, durationMs) {
  if (!(durationMs > 0)) return 1;
  if (!(tMs > 0)) return 0;
  return Math.min(1, tMs / durationMs);
}

/** Copier scan bar Y: triangle wave between top and bottom, 2s period (Req 5.2). */
export function copierScanY(tSec, top, bottom) {
  const period = COPIER_SCAN_PERIOD_SEC;
  const phase = (((tSec % period) + period) % period) / period; // [0,1)
  const tri = phase < 0.5 ? phase * 2 : (1 - phase) * 2;        // 0 -> 1 -> 0
  const y = top + (bottom - top) * tri;
  return Math.max(Math.min(top, bottom), Math.min(Math.max(top, bottom), y));
}

/** LED blink: on during the first half of each period (Req 5.5). */
export function ledOn(tMs, periodMs) {
  if (!(periodMs > 0)) return false;
  const phase = ((tMs % periodMs) + periodMs) % periodMs;
  return phase < periodMs / 2;
}

/**
 * Move pos toward target by speed*dt without overshooting (Req 9.3, 10.6).
 * Distance depends only on speed and elapsed time, never on frame count.
 */
export function moveToward(pos, target, speed, dtSec) {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.max(0, speed * dtSec);
  if (dist <= step || dist === 0) {
    return { x: target.x, y: target.y, arrived: true };
  }
  const k = step / dist;
  return { x: pos.x + dx * k, y: pos.y + dy * k, arrived: false };
}
