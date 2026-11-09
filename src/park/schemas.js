// PARK.EXE agent + app-phase schemas for the shared FsmEngine (pure module).
//
// Rules:
// - Waiting is expressed with context.dwell + TICK guards (sim time), never engine timeout
//   (timeout is used only by the App schema, which runs on wall-clock phases).
// - rng is injected through the factory closure; guards never call Math.random.
// - Contexts are JSON-serializable (the engine deep-copies them via JSON).
// - State configs may carry app-only fields `say` / `walkTo`; the engine ignores them.

const resetDwell = (ctx) => {
  ctx.dwell = 0;
};

// Per-state movement targets (anchor names from constants.js ANCHORS). null = stay put.
export const AGENT_STATE_TARGETS = Object.freeze({
  boss: Object.freeze({
    IDLE: null, REVIEWING: null, STAMP_APPROVE: null, STAMP_REJECT: null,
  }),
  newbie: Object.freeze({
    IDLE: null, WALKING_TO_BOSS: 'bossDeskFront', SUBMITTING: null,
    APPROVED: null, REJECTED: null, RETURNING: 'newbieStart',
  }),
  copier: Object.freeze({
    IDLE: null, WALKING_TO_COPIER: 'copierFront', PRINTING: null,
    DELIVERING: 'bossDeskFront', WAITING: null,
  }),
  coffee: Object.freeze({
    IDLE: null, WALKING_TO_COOLER: 'coolerFront', FILLING: null,
    SERVING: 'bossDeskFront', RECHARGING: 'rackFront',
  }),
});

// Per-state speech bubble lines shown on entry (Req 7.5, 7.6).
export const AGENT_STATE_SAY = Object.freeze({
  boss: Object.freeze({}),
  newbie: Object.freeze({ APPROVED: '승인!', REJECTED: '반려…' }),
  copier: Object.freeze({}),
  coffee: Object.freeze({}),
});

// Build a state config: shared onEnter dwell reset, optional extra init, walkTo/say metadata.
function state(agent, id, transitions, extraEnter) {
  const cfg = {
    onEnter(ctx) {
      resetDwell(ctx);
      if (extraEnter) extraEnter(ctx);
    },
    transitions: transitions || [],
  };
  const walkTo = AGENT_STATE_TARGETS[agent][id];
  if (walkTo) cfg.walkTo = walkTo;
  const say = AGENT_STATE_SAY[agent][id];
  if (say) cfg.say = say;
  return cfg;
}

export function createBossSchema(deps) {
  void deps;
  return {
    id: 'park-boss',
    initialState: 'IDLE',
    context: { dwell: 0, reviewSent: false },
    states: {
      IDLE: state('boss', 'IDLE', [
        {
          event: 'NEWBIE_SUBMITTED',
          target: 'REVIEWING',
          action(ctx) { ctx.reviewSent = false; },
        },
      ]),
      REVIEWING: state('boss', 'REVIEWING', [
        { event: 'RESULT_APPROVED', target: 'STAMP_APPROVE' },
        { event: 'RESULT_REJECTED', target: 'STAMP_REJECT' },
      ]),
      STAMP_APPROVE: state('boss', 'STAMP_APPROVE', [
        { event: 'NEWBIE_RETURNING', target: 'IDLE' },
      ]),
      STAMP_REJECT: state('boss', 'STAMP_REJECT', [
        { event: 'NEWBIE_RETURNING', target: 'IDLE' },
      ]),
    },
  };
}

export function createNewbieSchema(deps) {
  const { rng } = deps;
  const clearDoc = (ctx) => { ctx.hasDoc = false; };
  return {
    id: 'park-newbie',
    initialState: 'IDLE',
    context: { dwell: 0, idleFor: 2, hasDoc: false },
    states: {
      IDLE: state('newbie', 'IDLE', [
        {
          event: 'TICK',
          target: 'WALKING_TO_BOSS',
          guard: (ctx) => ctx.dwell >= ctx.idleFor,
          action(ctx) { ctx.hasDoc = true; },
        },
      ], (ctx) => { ctx.idleFor = 1 + rng() * 2; }),
      WALKING_TO_BOSS: state('newbie', 'WALKING_TO_BOSS', [
        { event: 'ARRIVED', target: 'SUBMITTING' },
      ]),
      SUBMITTING: state('newbie', 'SUBMITTING', [
        { event: 'REVIEW', target: 'APPROVED', probability: 0.7, action: clearDoc },
        { event: 'REVIEW', target: 'REJECTED', probability: 0.3, action: clearDoc },
      ]),
      APPROVED: state('newbie', 'APPROVED', [
        { event: 'TICK', target: 'RETURNING', guard: (ctx) => ctx.dwell >= 1.5 },
      ]),
      REJECTED: state('newbie', 'REJECTED', [
        { event: 'TICK', target: 'RETURNING', guard: (ctx) => ctx.dwell >= 1.5 },
      ]),
      RETURNING: state('newbie', 'RETURNING', [
        { event: 'ARRIVED', target: 'IDLE' },
      ]),
    },
  };
}

export function createCopierSchema(deps) {
  const { rng } = deps;
  return {
    id: 'park-copier',
    initialState: 'IDLE',
    context: { dwell: 0, pagesPrinted: 0, pagesTarget: 3 },
    states: {
      IDLE: state('copier', 'IDLE', [
        {
          event: 'COPY_REQUEST',
          target: 'WALKING_TO_COPIER',
          action(ctx) { ctx.pagesTarget = 2 + Math.floor(rng() * 3); },
        },
      ]),
      WALKING_TO_COPIER: state('copier', 'WALKING_TO_COPIER', [
        {
          event: 'ARRIVED',
          target: 'PRINTING',
          action(ctx) { ctx.pagesPrinted = 0; },
        },
      ]),
      // onEnter only resets dwell (shared helper): pagesPrinted must survive the self transition.
      PRINTING: state('copier', 'PRINTING', [
        {
          event: 'TICK',
          target: 'PRINTING',
          guard: (ctx) => ctx.dwell >= 1 && ctx.pagesPrinted + 1 < ctx.pagesTarget,
          action(ctx) { ctx.pagesPrinted += 1; },
        },
        {
          event: 'TICK',
          target: 'DELIVERING',
          guard: (ctx) => ctx.dwell >= 1 && ctx.pagesPrinted + 1 >= ctx.pagesTarget,
          action(ctx) { ctx.pagesPrinted += 1; },
        },
      ]),
      DELIVERING: state('copier', 'DELIVERING', [
        {
          event: 'ARRIVED',
          target: 'WAITING',
          action(ctx) { ctx.pagesPrinted = 0; },
        },
      ]),
      WAITING: state('copier', 'WAITING', [
        { event: 'TICK', target: 'IDLE', guard: (ctx) => ctx.dwell >= 2 },
      ], (ctx) => { ctx.pagesPrinted = 0; }),
    },
  };
}

export function createCoffeeSchema(deps) {
  void deps;
  return {
    id: 'park-coffee',
    initialState: 'IDLE',
    context: { dwell: 0, atRack: false },
    states: {
      IDLE: state('coffee', 'IDLE', [
        { event: 'TICK', target: 'WALKING_TO_COOLER', guard: (ctx) => ctx.dwell >= 3.0 },
      ]),
      WALKING_TO_COOLER: state('coffee', 'WALKING_TO_COOLER', [
        { event: 'ARRIVED', target: 'FILLING' },
      ]),
      FILLING: state('coffee', 'FILLING', [
        { event: 'TICK', target: 'SERVING', guard: (ctx) => ctx.dwell >= 1.5 },
      ]),
      SERVING: state('coffee', 'SERVING', [
        {
          event: 'ARRIVED',
          target: 'RECHARGING',
          action(ctx) { ctx.atRack = false; },
        },
      ]),
      RECHARGING: state('coffee', 'RECHARGING', [
        {
          // Arrival at the rack: self transition resets dwell so the 2.0s starts at arrival.
          event: 'ARRIVED',
          target: 'RECHARGING',
          action(ctx) { ctx.atRack = true; },
        },
        {
          event: 'TICK',
          target: 'IDLE',
          guard: (ctx) => ctx.atRack && ctx.dwell >= 2.0,
        },
      ]),
    },
  };
}

export function createAppSchema({ seekMs, crtOnMs }) {
  return {
    id: 'park-app',
    initialState: 'BOOT',
    context: {},
    states: {
      BOOT: { transitions: [{ event: 'PARK', target: 'PARKING' }] },
      PARKING: { timeout: { durationMs: seekMs, targetState: 'CRT_ON' } },
      CRT_ON: { timeout: { durationMs: crtOnMs, targetState: 'OFFICE' } },
      OFFICE: { transitions: [{ event: 'EXIT', target: 'BOOT' }] },
    },
  };
}

// Advance sim-time dwell and fire TICK. Returns whether a transition happened.
export function tickAgent(engine, dtSec) {
  engine.context.dwell += dtSec;
  return engine.send('TICK');
}
