// PARK.EXE constants. Pure module: no DOM, window, or canvas references.

export const LOGICAL_W = 320, LOGICAL_H = 200;
export const WALK_FRAME_SEC = 0.160;
export const ARRIVE_EPS = 2;                 // px (Req 9.3, 9.5)
export const MAX_FRAME_SEC = 0.100;          // Req 10.5
export const BUBBLE_SEC = 2.0;
export const SPEED = { newbie: 40, copier: 48, coffee: 36, boss: 0 };   // px/s
export const CRT_ON_MS = 300;                // 100..500 (Req 3.2)
export const SHAKE_MAX_PX = 4;               // Req 3.1
export const ROLL_PER_SEC = 1.25;            // >= 1 (Req 3.1)
export const COPIER_SCAN_PERIOD_SEC = 2.0;   // Req 5.2
export const LED_PERIODS_MS = [300, 700, 1300, 2000];  // 3+, within 300..2000 (Req 5.5)

// Fixed Office_Object rectangles (Req 5.1). Never mutated at runtime.
export const OBJECTS = Object.freeze({
  bossDesk:    Object.freeze({ x: 130, y: 20,  w: 60, h: 24 }),
  copier:      Object.freeze({ x: 20,  y: 60,  w: 32, h: 40 }),
  waterCooler: Object.freeze({ x: 270, y: 70,  w: 20, h: 36 }),
  serverRack:  Object.freeze({ x: 280, y: 130, w: 28, h: 50 })
});

// Agent sprite top-left target positions (16x16 sprites), all inside 320x200.
export const ANCHORS = Object.freeze({
  newbieStart:   Object.freeze({ x: 150, y: 150 }),
  bossDeskFront: Object.freeze({ x: 152, y: 52 }),
  copierFront:   Object.freeze({ x: 28,  y: 106 }),
  coolerFront:   Object.freeze({ x: 248, y: 92 }),
  rackFront:     Object.freeze({ x: 258, y: 150 })
});
