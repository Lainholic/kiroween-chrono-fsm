// rAF loop wrapper. Pure: raf/caf are injected, no window/document access.
// Requirements 10.1-10.5.

const MAX_FRAME_MS = 100;

/**
 * @param {{ raf: (cb: (ts: number) => void) => any,
 *           caf: (handle: any) => void,
 *           onFrame: (dtSec: number) => void }} deps
 */
export function createLoop({ raf, caf, onFrame }) {
  let running = false; // start() called and not stopped
  let paused = false;
  let handle = null;   // pending raf handle, null when none
  let scheduled = false;
  let lastTs = null;   // last frame timestamp (ms), null => next dt = 0
  let token = 0;       // invalidates callbacks from cancelled schedules

  function cancelPending() {
    token++;
    if (scheduled) {
      scheduled = false;
      const h = handle;
      handle = null;
      caf(h);
    }
  }

  function schedule() {
    const myToken = ++token;
    scheduled = true;
    handle = raf((ts) => {
      if (myToken !== token || !running || paused) return;
      scheduled = false;
      handle = null;
      let dt = 0;
      if (lastTs !== null) {
        const rawMs = ts - lastTs;
        dt = Math.max(0, Math.min(rawMs, MAX_FRAME_MS)) / 1000;
      }
      lastTs = ts;
      // Schedule next frame first so onFrame may call stop()/pause().
      schedule();
      onFrame(dt);
    });
  }

  return {
    start() {
      if (running) return;
      running = true;
      paused = false;
      lastTs = null;
      schedule();
    },
    stop() {
      running = false;
      paused = false;
      lastTs = null;
      cancelPending();
    },
    pause() {
      if (!running || paused) return;
      paused = true;
      lastTs = null;
      cancelPending();
    },
    resume() {
      if (!running || !paused) return;
      paused = false;
      lastTs = null;
      schedule();
    },
  };
}
