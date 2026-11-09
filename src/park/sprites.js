// PARK.EXE sprites. Pure module: no DOM, window, or canvas references.
// Each frame is 16 strings x 16 hex-digit chars; a char is a palette index.
// Palette index 0 is always transparent.

import { WALK_FRAME_SEC } from './constants.js';

const SIZE = 16;

// ---------------------------------------------------------------- Boss
// Suit, red tie, brown hair, grumpy face.
const BOSS_A = [
  '0000011111100000',
  '0000133333310000',
  '0001333333331000',
  '0001222222221000',
  '0001212222121000',
  '0001222112221000',
  '0000122222210000',
  '0000145665410000',
  '0001444664441000',
  '0001484664841000',
  '0001444664441000',
  '0001244664421000',
  '0000144444410000',
  '0000144001441000',
  '0000177001771000',
  '0000111001110000'
];
const BOSS_B = [
  '0000011111100000',
  '0000133333310000',
  '0001333333331000',
  '0001222222221000',
  '0001212222121000',
  '0001222112221000',
  '0000122222210000',
  '0000145665410000',
  '0001444664441000',
  '0001484664841000',
  '0001444664441000',
  '0001244664421000',
  '0000144444410000',
  '0001441001441000',
  '0001771001771000',
  '0001110001110000'
];

// ---------------------------------------------------------------- Newbie lemming
// Green spiky hair, blue shirt, holding a paper (index 5 = paper only).
const NEWBIE_A = [
  '0000030303030000',
  '0000133333310000',
  '0001333333331000',
  '0001222222221000',
  '0001212222121000',
  '0001222112221000',
  '0000122222210000',
  '0000144444415555',
  '0000144444415555',
  '0000144444225555',
  '0000144444415555',
  '0000144444415555',
  '0000144444410000',
  '0000144001441000',
  '0000177001771000',
  '0000111001110000'
];
const NEWBIE_B = [
  '0000303030300000',
  '0000133333310000',
  '0001333333331000',
  '0001222222221000',
  '0001212222121000',
  '0001222112221000',
  '0000122222210000',
  '0000144444415555',
  '0000144444415555',
  '0000144444225555',
  '0000144444415555',
  '0000144444415555',
  '0000144444410000',
  '0001441001441000',
  '0001771001771000',
  '0001110001110000'
];

// ---------------------------------------------------------------- Copier runner
// Red cap, orange shirt, hugging a stack of paper while running.
const COPIER_A = [
  '0000011111000000',
  '0000133333100000',
  '0001333333311000',
  '0001222222221000',
  '0001212222121000',
  '0001222112221000',
  '0000122222210000',
  '0000144444410000',
  '0555144444410000',
  '0555244444410000',
  '0555144444410000',
  '0000144444410000',
  '0000166666610000',
  '0000166116610000',
  '0000177001770000',
  '0000111001110000'
];
const COPIER_B = [
  '0000011111000000',
  '0000133333100000',
  '0001333333311000',
  '0001222222221000',
  '0001212222121000',
  '0001222112221000',
  '0000122222210000',
  '0555144444410000',
  '0555244444410000',
  '0555144444410000',
  '0000144444410000',
  '0000144444410000',
  '0000166666610000',
  '0001661001661000',
  '0001771001771000',
  '0001110001110000'
];

// ---------------------------------------------------------------- Coffee bot
// Boxy robot with antenna, glowing eyes and a steaming cup.
const COFFEE_A = [
  '0000000880000000',
  '0000000110000000',
  '0000111111110000',
  '0001233333321000',
  '0001244444421000',
  '0001245445421000',
  '0001244444421700',
  '0000122222210070',
  '0001233333217777',
  '0001233333216666',
  '0001245454210666',
  '0001222222210066',
  '0000111111110000',
  '0000199119910000',
  '0000111001110000',
  '0000000000000000'
];
const COFFEE_B = [
  '0000000088000000',
  '0000000110000000',
  '0000111111110000',
  '0001233333321000',
  '0001244444421000',
  '0001245445421000',
  '0001244444421070',
  '0000122222210700',
  '0001233333217777',
  '0001233333216666',
  '0001245454210666',
  '0001222222210066',
  '0000111111110000',
  '0001991001991000',
  '0001110001110000',
  '0000000000000000'
];

export const SPRITES = Object.freeze({
  boss: Object.freeze({
    // 0 clear, 1 outline, 2 skin, 3 hair, 4 suit, 5 shirt, 6 tie, 7 shoes, 8 suit highlight
    palette: Object.freeze(['transparent', '#1a1a2e', '#f2c9a0', '#5a3a22', '#3b4a6b', '#f5f5f4', '#d62839', '#2b2b2b', '#5a6d94']),
    frames: Object.freeze([Object.freeze(BOSS_A), Object.freeze(BOSS_B)])
  }),
  newbie: Object.freeze({
    // 0 clear, 1 outline, 2 skin, 3 green hair, 4 shirt, 5 paper, 6 unused, 7 shoes
    palette: Object.freeze(['transparent', '#14301a', '#ffe0bd', '#4ade80', '#3b82f6', '#f5f5f4', '#9ca3af', '#7c2d12']),
    paperIndex: 5,
    frames: Object.freeze([Object.freeze(NEWBIE_A), Object.freeze(NEWBIE_B)])
  }),
  copier: Object.freeze({
    // 0 clear, 1 outline, 2 skin, 3 cap, 4 shirt, 5 paper, 6 pants, 7 shoes
    palette: Object.freeze(['transparent', '#1f2937', '#fbbf77', '#ef4444', '#f59e0b', '#f5f5f4', '#374151', '#111827']),
    frames: Object.freeze([Object.freeze(COPIER_A), Object.freeze(COPIER_B)])
  }),
  coffee: Object.freeze({
    // 0 clear, 1 outline, 2 metal, 3 light metal, 4 screen, 5 eye, 6 cup, 7 steam/lid, 8 antenna, 9 wheels
    palette: Object.freeze(['transparent', '#111827', '#9ca3af', '#d1d5db', '#0f172a', '#22d3ee', '#92400e', '#f5f5f4', '#ef4444', '#4b5563']),
    frames: Object.freeze([Object.freeze(COFFEE_A), Object.freeze(COFFEE_B)])
  })
});

/**
 * Decode a frame into 256 palette indices (row-major). Anything that is not a
 * hex digit below paletteLength, and any missing row/cell, becomes -1
 * (transparent). Never throws.
 */
export function decodeSprite(frame, paletteLength) {
  const out = new Int8Array(SIZE * SIZE).fill(-1);
  const limit = Number.isFinite(paletteLength) ? paletteLength : 0;
  if (!Array.isArray(frame)) return out;
  for (let y = 0; y < SIZE; y++) {
    const row = frame[y];
    if (typeof row !== 'string') continue;
    for (let x = 0; x < SIZE; x++) {
      const ch = row[x];
      if (typeof ch !== 'string' || !/^[0-9a-fA-F]$/.test(ch)) continue;
      const idx = parseInt(ch, 16);
      if (idx < limit) out[y * SIZE + x] = idx;
    }
  }
  return out;
}

/**
 * Returns a copy of the decoded pixels. When hasDoc is false, pixels using
 * paperIndex become -1 so the document is not drawn.
 */
export function visiblePixels(decoded, opts = {}) {
  const out = Int8Array.from(decoded);
  const { paperIndex, hasDoc } = opts;
  if (!hasDoc && typeof paperIndex === 'number') {
    for (let i = 0; i < out.length; i++) {
      if (out[i] === paperIndex) out[i] = -1;
    }
  }
  return out;
}

/**
 * Walk pose from elapsed walking time. Idle -> frame A, no offset.
 * Moving: 160ms per frame, frame B is lifted by 1px.
 */
export function walkPose(walkTimeSec, moving) {
  if (!moving || !Number.isFinite(walkTimeSec) || walkTimeSec < 0) {
    return { frame: 0, dy: 0 };
  }
  const frame = Math.floor(walkTimeSec / WALK_FRAME_SEC) % 2;
  return frame === 0 ? { frame: 0, dy: 0 } : { frame: 1, dy: -1 };
}
