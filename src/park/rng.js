// Seeded PRNG helpers. Pure module: no DOM, window, or canvas references.

/** mulberry32: returns a function producing floats in [0, 1). */
export function createRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Runs fn with Math.random replaced by a seeded PRNG; always restores it. */
export function withSeededMathRandom(seed, fn) {
  const original = Math.random;
  Math.random = createRng(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}
