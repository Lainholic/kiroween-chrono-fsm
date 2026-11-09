// PARK.EXE speech bubble store. Pure module: no DOM, window, or canvas references.
import { LOGICAL_W, LOGICAL_H, BUBBLE_SEC } from './constants.js';

// At most one bubble per agent. A new show() for the same agent replaces the old one
// immediately (Req 9.10). update() drops bubbles shown for BUBBLE_SEC or longer (Req 9.8).
export function createBubbleStore() {
  const bubbles = new Map();   // agentId -> { agentId, text, since }

  return {
    show(agentId, text, nowSec) {
      bubbles.delete(agentId);   // re-insert so ordering follows latest show
      bubbles.set(agentId, { agentId, text, since: nowSec });
    },
    update(nowSec) {
      for (const [id, b] of bubbles) {
        if (nowSec - b.since >= BUBBLE_SEC) bubbles.delete(id);
      }
    },
    active() {
      return Array.from(bubbles.values(), (b) => ({ agentId: b.agentId, text: b.text, since: b.since }));
    }
  };
}

// Shift a w*h rect so it lies fully inside the 320x200 logical screen (Req 9.9).
// Rects larger than the screen are pinned to the top-left edge.
export function clampBubbleRect(x, y, w, h) {
  const maxX = Math.max(0, LOGICAL_W - w);
  const maxY = Math.max(0, LOGICAL_H - h);
  return {
    x: Math.min(Math.max(x, 0), maxX),
    y: Math.min(Math.max(y, 0), maxY)
  };
}
