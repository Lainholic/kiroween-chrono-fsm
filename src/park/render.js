// PARK.EXE Canvas 2D renderer. [canvas] module: with main.js, the only place that touches canvas.
// All animation time comes from sim.time / explicit t arguments, never the wall clock.
import { LOGICAL_W, LOGICAL_H, OBJECTS, LED_PERIODS_MS } from './constants.js';
import { SPRITES, decodeSprite, visiblePixels, walkPose } from './sprites.js';
import { computeScale, copierScanY, ledOn } from './scene-math.js';
import { clampBubbleRect } from './bubbles.js';

const FONT_STACK = 'Consolas, monospace';
const AGENT_ORDER = ['boss', 'copier', 'coffee', 'newbie'];
const BUBBLE_TAIL = 3;

const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

function defaultCreateCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * @param screenCanvas canvas element shown to the user
 * @param opts optional { createCanvas(w,h) } factory for the offscreen logical canvas
 */
export function createRenderer(screenCanvas, opts = {}) {
  const createCanvas = typeof opts.createCanvas === 'function' ? opts.createCanvas : defaultCreateCanvas;
  const logical = createCanvas(LOGICAL_W, LOGICAL_H);
  const lctx = logical.getContext('2d');
  const sctx = screenCanvas.getContext('2d');

  // Decoded sprite cache: key -> Int8Array (decode once, never per frame).
  const decoded = {};
  function getPixels(id, frame, hasDoc) {
    const spr = SPRITES[id];
    if (!spr) return null;
    const key = id + ':' + frame;
    if (!decoded[key]) decoded[key] = decodeSprite(spr.frames[frame], spr.palette.length);
    return visiblePixels(decoded[key], { paperIndex: spr.paperIndex, hasDoc: !!hasDoc });
  }

  let vw = LOGICAL_W, vh = LOGICAL_H, scale = 1, ox = 0, oy = 0;
  let vignette = null;

  function setSmoothing() {
    for (const c of [lctx, sctx]) {
      if (!c) continue;
      c.imageSmoothingEnabled = false;
    }
  }

  // w, h are DEVICE pixels (main.js multiplies the CSS box by devicePixelRatio); the backing
  // store is 1:1 with device px, so scale, scanline period and glow offsets are device px.
  function resize(w, h) {
    vw = Math.max(1, Math.floor(num(w, LOGICAL_W)));
    vh = Math.max(1, Math.floor(num(h, LOGICAL_H)));
    scale = computeScale(vw, vh);
    screenCanvas.width = vw;     // resets context state, so reapply below
    screenCanvas.height = vh;
    ox = Math.floor((vw - LOGICAL_W * scale) / 2);
    oy = Math.floor((vh - LOGICAL_H * scale) / 2);
    setSmoothing();
    // Vignette: created once per resize and reused every frame.
    vignette = null;
    try {
      const cx = vw / 2, cy = vh / 2;
      const r = Math.hypot(cx, cy);
      const g = sctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.55)');
      vignette = g;
    } catch (e) { vignette = null; }
  }

  // ------------------------------------------------------------ presenting + CRT post pass
  /**
   * Blit logical canvas to the screen with an integer scale, then run the CRT post pass.
   * view: { dx, dy (logical px shake), roll (logical px), squeeze (0..1 vertical fraction), line (0..1) }
   */
  function present(view = {}) {
    const dx = Math.round(num(view.dx));
    const dy = Math.round(num(view.dy));
    const roll = Math.floor(num(view.roll));
    const squeeze = view.squeeze === undefined ? 1 : Math.max(0, Math.min(1, num(view.squeeze, 1)));
    sctx.globalCompositeOperation = 'source-over';
    sctx.globalAlpha = 1;
    sctx.fillStyle = '#000';
    sctx.fillRect(0, 0, vw, vh);

    const fullH = LOGICAL_H * scale;
    const drawH = Math.max(0, Math.round(fullH * squeeze));
    const drawY = oy + Math.round((fullH - drawH) / 2);
    const drawW = LOGICAL_W * scale;
    const wScaled = view.line !== undefined ? Math.round(drawW * Math.max(0, Math.min(1, num(view.line)))) : drawW;
    const drawX = ox + dx * scale + Math.round((drawW - wScaled) / 2);

    if (drawH > 0 && wScaled > 0) {
      if (roll > 0 && squeeze >= 1) {
        // Vertical roll: two slices of the logical screen wrapped around.
        const topH = (LOGICAL_H - roll);
        sctx.drawImage(logical, 0, roll, LOGICAL_W, LOGICAL_H - roll,
          drawX, oy + dy * scale, wScaled, topH * scale);
        sctx.drawImage(logical, 0, 0, LOGICAL_W, roll,
          drawX, oy + dy * scale + topH * scale, wScaled, roll * scale);
      } else {
        sctx.drawImage(logical, 0, 0, LOGICAL_W, LOGICAL_H,
          drawX, drawY + dy * scale, wScaled, drawH);
      }
    }
    if (view.whiteLine) {
      const lw = Math.round(drawW * Math.max(0, Math.min(1, num(view.whiteLine))));
      sctx.fillStyle = '#fff';
      sctx.fillRect(ox + Math.round((drawW - lw) / 2), oy + Math.floor(fullH / 2), lw, Math.max(1, scale));
    }
    crtPost(drawX, drawY + dy * scale, wScaled, drawH);
  }

  function crtPost(x, y, w, h) {
    // Phosphor glow: faint additive second pass.
    sctx.globalCompositeOperation = 'lighter';
    sctx.globalAlpha = 0.12;
    if (w > 0 && h > 0) {
      const pad = Math.max(1, Math.round(scale / 2));   // glow spread in device px
      sctx.drawImage(logical, 0, 0, LOGICAL_W, LOGICAL_H, x - pad, y - pad, w + 2 * pad, h + 2 * pad);
    }
    sctx.globalCompositeOperation = 'source-over';
    // Scanlines: one dark line per logical row, spaced `scale` px apart.
    sctx.globalAlpha = 1;
    sctx.fillStyle = 'rgba(0,0,0,0.25)';
    const lineH = Math.max(1, Math.floor(scale / 3));
    const end = Math.min(vh, y + h);
    for (let yy = Math.max(0, y + scale - lineH); yy < end; yy += scale) {
      sctx.fillRect(0, yy, vw, lineH);
    }
    if (vignette) {
      sctx.fillStyle = vignette;
      sctx.fillRect(0, 0, vw, vh);
    }
  }

  // ------------------------------------------------------------ boot
  function drawBoot(boot, view = {}) {
    try {
      const t = num(view.t);
      lctx.globalAlpha = 1;
      lctx.fillStyle = '#000';
      lctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
      lctx.font = '10px Consolas, monospace';
      lctx.textBaseline = 'top';
      const lines = boot && Array.isArray(boot.lines) ? boot.lines : [];
      const input = boot && typeof boot.input === 'string' ? boot.input : '';
      let active = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (typeof lines[i] === 'string' && lines[i].startsWith('C:\\>')) { active = i; break; }
      }
      const LH = 11, maxLines = Math.floor((LOGICAL_H - 8) / LH);
      const first = Math.max(0, lines.length - maxLines);
      for (let i = first; i < lines.length; i++) {
        const y = 4 + (i - first) * LH;
        const text = String(lines[i]);
        const isPrompt = i === active;
        lctx.fillStyle = isPrompt ? '#ffb000' : '#33ff66';
        lctx.fillText(text, 4, y);
        if (isPrompt) {
          const base = text.length > 4 ? text : text;   // committed text, if any, already included
          const shown = base === 'C:\\>' ? base + input : base;
          if (base === 'C:\\>') lctx.fillText(input, 4 + 'C:\\>'.length * 6, y);
          if (Math.floor(t * 2) % 2 === 0) {
            lctx.fillStyle = '#ffb000';
            lctx.fillRect(4 + shown.length * 6, y + 1, 6, 8);
          }
        }
      }
      present({ dx: view.shake && view.shake.dx, dy: view.shake && view.shake.dy, roll: view.roll });
    } catch (e) { /* never throw on bad data */ }
  }

  // ------------------------------------------------------------ office
  function rect(x, y, w, h, c) {
    lctx.fillStyle = c;
    lctx.fillRect(x, y, w, h);
  }

  function drawObjects(sim, tSec) {
    const agents = (sim && sim.agents) || {};
    const stateOf = (id) => {
      try { return agents[id].engine.getCurrentState(); } catch (e) { return null; }
    };
    // Boss desk
    const d = OBJECTS.bossDesk;
    rect(d.x, d.y, d.w, d.h, '#6b4423');
    rect(d.x, d.y, d.w, 4, '#8a5a30');
    rect(d.x + 6, d.y + 6, 14, 10, '#222');
    rect(d.x + 8, d.y + 8, 10, 6, '#33ff66');
    rect(d.x + d.w - 16, d.y + 8, 10, 8, '#f5f5f4');
    // Copier
    const c = OBJECTS.copier;
    rect(c.x, c.y, c.w, c.h, '#9ca3af');
    rect(c.x, c.y, c.w, 6, '#6b7280');
    rect(c.x + 3, c.y + 9, c.w - 6, c.h - 18, '#374151');
    rect(c.x + 3, c.y + c.h - 7, c.w - 6, 4, '#f5f5f4');
    const top = c.y + 10, bottom = c.y + c.h - 12;
    const sy = Math.round(copierScanY(tSec, top, bottom));
    rect(c.x + 4, sy, c.w - 8, 2, stateOf('copier') === 'PRINTING' ? '#e6ffff' : '#2b4a4a');
    // Water cooler
    const w = OBJECTS.waterCooler;
    rect(w.x + 2, w.y, w.w - 4, 16, '#7dd3fc');
    rect(w.x, w.y + 16, w.w, w.h - 16, '#e5e7eb');
    rect(w.x + 6, w.y + 22, 8, 3, '#374151');
    if (stateOf('coffee') === 'FILLING') {
      for (let i = 0; i < 4; i++) {
        const phase = ((tSec * 1.5 + i * 0.25) % 1 + 1) % 1;
        const bx = w.x + 5 + ((i * 5) % (w.w - 8));
        const by = Math.round(w.y + 15 - phase * 14);
        rect(bx, by, 2, 2, '#e0f7ff');
      }
    }
    // Server rack
    const r = OBJECTS.serverRack;
    rect(r.x, r.y, r.w, r.h, '#1f2937');
    rect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, '#111827');
    const periods = Array.isArray(LED_PERIODS_MS) && LED_PERIODS_MS.length ? LED_PERIODS_MS : [300, 700, 1300];
    const n = Math.max(3, periods.length);
    for (let i = 0; i < n; i++) {
      const ly = r.y + 6 + i * 10;
      if (ly + 3 > r.y + r.h) break;
      rect(r.x + 4, ly, r.w - 14, 6, '#374151');
      const on = ledOn(tSec * 1000, periods[i % periods.length]);
      rect(r.x + r.w - 8, ly + 1, 3, 3, on ? (i % 2 ? '#22ff66' : '#ff3b3b') : '#183024');
    }
  }

  function drawAgent(agent) {
    if (!agent || !agent.engine) return;
    const spr = SPRITES[agent.id];
    if (!spr) return;
    const pose = walkPose(num(agent.walkTime), !!agent.moving);
    let hasDoc = false;
    try { hasDoc = !!agent.engine.getContext().hasDoc; } catch (e) { hasDoc = false; }
    const px = getPixels(agent.id, pose.frame, hasDoc);
    if (!px) return;
    const baseX = Math.round(num(agent.pos && agent.pos.x));
    const baseY = Math.round(num(agent.pos && agent.pos.y)) + pose.dy;
    const mirror = agent.dir < 0;
    for (let row = 0; row < 16; row++) {
      for (let col = 0; col < 16; col++) {
        const idx = px[row * 16 + col];
        if (idx <= 0) continue;   // -1 undefined, 0 transparent
        const color = spr.palette[idx];
        if (!color) continue;
        lctx.fillStyle = color;
        lctx.fillRect(baseX + (mirror ? 15 - col : col), baseY + row, 1, 1);
      }
    }
  }

  function bubbleWidth(text) {
    let w = 4;
    // Consolas 8px glyphs are ~4.5px wide; emoji / astral / symbol code points need ~10px.
    for (const ch of text) w += ch.codePointAt(0) > 0x2ff ? 10 : 5;
    return Math.max(12, w);
  }

  function drawBubbles(sim) {
    let list = [];
    try { list = sim.bubbles.active(); } catch (e) { return; }
    lctx.font = `8px ${FONT_STACK}`;
    lctx.textBaseline = 'top';
    for (const b of list) {
      const agent = sim.agents && sim.agents[b.agentId];
      if (!agent || typeof b.text !== 'string') continue;
      const w = bubbleWidth(b.text), h = 12;
      const ax = Math.round(num(agent.pos && agent.pos.x)) + 8;
      const ay = Math.round(num(agent.pos && agent.pos.y));
      const p = clampBubbleRect(ax - Math.floor(w / 2), ay - h - BUBBLE_TAIL, w, h);
      rect(p.x, p.y, w, h, '#f5f5f4');
      rect(p.x, p.y, w, 1, '#111'); rect(p.x, p.y + h - 1, w, 1, '#111');
      rect(p.x, p.y, 1, h, '#111'); rect(p.x + w - 1, p.y, 1, h, '#111');
      rect(Math.min(Math.max(ax, p.x + 1), p.x + w - 3), p.y + h, 2, BUBBLE_TAIL, '#f5f5f4');
      lctx.fillStyle = '#111';
      lctx.fillText(b.text, p.x + 2, p.y + 2);
    }
  }

  function drawOfficeLogical(sim, t) {
    const tSec = num(sim && sim.time, num(t));
    lctx.globalAlpha = 1;
    // wall + floor
    rect(0, 0, LOGICAL_W, 56, '#3a3f58');
    rect(0, 56, LOGICAL_W, LOGICAL_H - 56, '#5b5f73');
    for (let y = 60; y < LOGICAL_H; y += 20) rect(0, y, LOGICAL_W, 1, '#4d5164');
    for (let x = 0; x < LOGICAL_W; x += 40) rect(x, 56, 1, LOGICAL_H - 56, '#4d5164');
    rect(0, 54, LOGICAL_W, 2, '#22243a');
    drawObjects(sim, tSec);
    const agents = (sim && sim.agents) || {};
    for (const id of AGENT_ORDER) drawAgent(agents[id]);
    drawBubbles(sim || {});
  }

  function drawOffice(sim, t) {
    try {
      drawOfficeLogical(sim, t);
      present();
    } catch (e) { /* never throw on bad data */ }
  }

  /** CRT power-on: redraws the last logical frame squeezed from a white line. progress in [0,1]. */
  function drawCrtOn(progress) {
    try {
      const p = Math.max(0, Math.min(1, num(progress)));
      if (p < 0.35) {
        const q = p / 0.35;
        present({ squeeze: 0, whiteLine: 0.15 + 0.85 * q });
      } else {
        present({ squeeze: Math.max(0.02, (p - 0.35) / 0.65) });
      }
    } catch (e) { /* never throw */ }
  }

  setSmoothing();
  resize(LOGICAL_W, LOGICAL_H);

  return {
    resize,
    drawBoot,
    drawOffice,
    drawCrtOn,
    getScale: () => scale
  };
}
