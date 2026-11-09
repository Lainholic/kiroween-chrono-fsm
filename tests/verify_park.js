'use strict';
/**
 * PARK.EXE verifier. CommonJS, node: builtins only (+ ./lib helpers).
 * Run: node tests/verify_park.js
 *
 * Add a new check by calling check('[prefix:name] description', async () => { ... }) in the
 * "CHECKS" section. Throwing (or rejecting) fails only that check. To report a mismatch with
 * expected/actual details, throw `new Mismatch(expected, actual)` or use expectEq().
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { formatCheck, summarize, formatSummary } = require('./lib/report.js');
const { engineHash, normalizeRuntime, stripComments } = require('./lib/engine-normalize.js');

const ROOT = path.resolve(__dirname, '..');
const PARK_DIR = path.join(ROOT, 'src', 'park');
const ENGINE_JS = path.join(ROOT, 'src', 'core', 'fsm-engine.js');
const ENGINE_TS = path.join(ROOT, 'src', 'core', 'fsm-engine.ts');

// sha256 of `git show HEAD:src/core/fsm-engine.js` (LF-normalized), taken before park-exe work.
const ENGINE_BASELINE_HASH = 'e0ddb73378d151890f655baf85d27de4de06b814a186f7729ac31ae1fd45bdb1';

// Modules without DOM access. audio.js is held to the same rule; render.js/main.js are exempt.
const PURE_MODULES = [
  'constants', 'rng', 'sprites', 'schemas', 'bubbles', 'sim', 'loop', 'boot',
  'audio-plan', 'scene-math',
];
const NO_DOM_MODULES = [...PURE_MODULES, 'audio'];

// ---------------------------------------------------------------- harness
class Mismatch extends Error {
  constructor(expected, actual) {
    super('mismatch');
    this.expected = expected;
    this.actual = actual;
  }
}
function expectEq(actual, expected) {
  if (actual !== expected && !(Number.isNaN(actual) && Number.isNaN(expected))) {
    throw new Mismatch(expected, actual);
  }
}
function expectTrue(cond, expected, actual) {
  if (!cond) throw new Mismatch(expected, actual);
}

const registry = [];
function check(name, fn) {
  registry.push({ name, fn });
}

const readText = (p) => fs.readFileSync(p, 'utf8');
const loadPark = (name) => import(pathToFileURL(path.join(PARK_DIR, name + '.js')).href);
const loadEngine = () => import(pathToFileURL(ENGINE_JS).href);
const stripped = (file) => stripComments(readText(file));

// ---------------------------------------------------------------- shared data
const AGENT_STATES = {
  boss: ['IDLE', 'REVIEWING', 'STAMP_APPROVE', 'STAMP_REJECT'],
  newbie: ['IDLE', 'WALKING_TO_BOSS', 'SUBMITTING', 'APPROVED', 'REJECTED', 'RETURNING'],
  copier: ['IDLE', 'WALKING_TO_COPIER', 'PRINTING', 'DELIVERING', 'WAITING'],
  coffee: ['IDLE', 'WALKING_TO_COOLER', 'FILLING', 'SERVING', 'RECHARGING'],
};
const APP_STATES = ['BOOT', 'PARKING', 'CRT_ON', 'OFFICE'];
const FACTORIES = {
  boss: 'createBossSchema',
  newbie: 'createNewbieSchema',
  copier: 'createCopierSchema',
  coffee: 'createCoffeeSchema',
};

async function buildSchemas() {
  const [schemas, rngMod] = await Promise.all([loadPark('schemas'), loadPark('rng')]);
  const out = {};
  for (const id of Object.keys(FACTORIES)) {
    out[id] = schemas[FACTORIES[id]]({ rng: rngMod.createRng(1) });
  }
  out.app = schemas.createAppSchema({ seekMs: 2400, crtOnMs: 300 });
  return out;
}

function transitionsOf(stateCfg) {
  return Array.isArray(stateCfg && stateCfg.transitions) ? stateCfg.transitions : [];
}

// ---------------------------------------------------------------- CHECKS: engine
check('[engine:hash] fsm-engine.js matches baseline sha256 (LF-normalized)', () => {
  const actual = engineHash(readText(ENGINE_JS));
  if (actual !== ENGINE_BASELINE_HASH) {
    throw new Mismatch(ENGINE_BASELINE_HASH, actual);
  }
});

check('[engine:twin] fsm-engine.js and fsm-engine.ts share identical runtime logic', () => {
  const js = normalizeRuntime(readText(ENGINE_JS), 'js');
  const ts = normalizeRuntime(readText(ENGINE_TS), 'ts');
  if (js !== ts) {
    let i = 0;
    while (i < js.length && i < ts.length && js[i] === ts[i]) i++;
    throw new Mismatch(
      'identical normalized runtime',
      `first difference at offset ${i}: js=${JSON.stringify(js.slice(i, i + 40))} ts=${JSON.stringify(ts.slice(i, i + 40))}`
    );
  }
});

// ---------------------------------------------------------------- CHECKS: data audits
check('[audit:sprite] 8 frames, 16 rows x 16 cols, indices < palette length', async () => {
  const { SPRITES } = await loadPark('sprites');
  let frames = 0;
  for (const id of ['boss', 'newbie', 'copier', 'coffee']) {
    const sp = SPRITES[id];
    expectTrue(sp && Array.isArray(sp.palette), `${id}: palette`, typeof (sp && sp.palette));
    expectTrue(Array.isArray(sp.frames) && sp.frames.length === 2, `${id}: 2 frames`, sp.frames && sp.frames.length);
    sp.frames.forEach((frame, fi) => {
      frames++;
      expectEq(frame.length, 16);
      frame.forEach((row, y) => {
        if (typeof row !== 'string' || row.length !== 16) {
          throw new Mismatch(`${id}[${fi}] row ${y} length 16`, row && row.length);
        }
        for (let x = 0; x < 16; x++) {
          const idx = parseInt(row[x], 16);
          if (!/^[0-9a-fA-F]$/.test(row[x]) || idx >= sp.palette.length) {
            throw new Mismatch(`${id}[${fi}] (${x},${y}) index < ${sp.palette.length}`, row[x]);
          }
        }
      });
    });
  }
  expectEq(frames, 8);
});

for (const id of [...Object.keys(AGENT_STATES), 'app']) {
  check(`[schema:${id}] targets exist, initial state, required state set`, async () => {
    const schema = (await buildSchemas())[id];
    const stateIds = Object.keys(schema.states);
    const required = id === 'app' ? APP_STATES : AGENT_STATES[id];
    expectEq([...stateIds].sort().join(','), [...required].sort().join(','));
    expectEq(schema.initialState, id === 'app' ? 'BOOT' : 'IDLE');
    for (const [sid, cfg] of Object.entries(schema.states)) {
      for (const t of transitionsOf(cfg)) {
        if (!Object.prototype.hasOwnProperty.call(schema.states, t.target)) {
          throw new Mismatch(`${sid} --${t.event}--> existing state`, t.target);
        }
      }
      if (cfg.timeout && !Object.prototype.hasOwnProperty.call(schema.states, cfg.timeout.targetState)) {
        throw new Mismatch(`${sid} timeout -> existing state`, cfg.timeout.targetState);
      }
    }
  });
}

check('[audit:probability] groups per (from,event) sum to 1 within 1e-9; Newbie SUBMITTING REVIEW is probabilistic', async () => {
  const schemas = await buildSchemas();
  for (const [sid, schema] of Object.entries(schemas)) {
    for (const [from, cfg] of Object.entries(schema.states)) {
      const groups = new Map();
      for (const t of transitionsOf(cfg)) {
        if (typeof t.probability === 'number') {
          groups.set(t.event, (groups.get(t.event) || []).concat(t));
        }
      }
      for (const [event, list] of groups) {
        const all = transitionsOf(cfg).filter((t) => t.event === event);
        expectTrue(all.length === list.length, `${sid}.${from}.${event}: every candidate has probability`, `${list.length}/${all.length}`);
        const sum = list.reduce((a, t) => a + t.probability, 0);
        if (!(Math.abs(sum - 1) <= 1e-9)) throw new Mismatch(`${sid}.${from}.${event} sum 1`, sum);
      }
    }
  }
  const review = transitionsOf(schemas.newbie.states.SUBMITTING).filter((t) => t.event === 'REVIEW');
  expectTrue(review.length >= 2 && review.every((t) => typeof t.probability === 'number'),
    'newbie SUBMITTING REVIEW has >=2 probability transitions', review.length);
});

// ---------------------------------------------------------------- CHECKS: behaviour
check('[fsm:review] 10,000 seeded REVIEW sends: APPROVED ratio in [0.67,0.73], reproducible', async () => {
  const [{ FsmEngine }, schemas, rngMod] = await Promise.all([loadEngine(), loadPark('schemas'), loadPark('rng')]);
  const original = Math.random;
  const run = (seed) => rngMod.withSeededMathRandom(seed, () => {
    let approved = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) {
      const schema = schemas.createNewbieSchema({ rng: rngMod.createRng(i + 1) });
      schema.initialState = 'SUBMITTING';
      const engine = new FsmEngine(schema);
      engine.send('REVIEW');
      if (engine.getCurrentState() === 'APPROVED') approved++;
      engine.destroy();
    }
    return approved / N;
  });
  const a = run(20260101);
  const b = run(20260101);
  expectTrue(Math.random === original, 'Math.random restored', 'not restored');
  expectTrue(a >= 0.67 && a <= 0.73, 'ratio in [0.67,0.73]', a);
  expectEq(b, a);
});

check('[fsm:copier] PRINTING loop runs exactly pagesTarget ticks before DELIVERING (1,3,5)', async () => {
  const [{ FsmEngine }, schemas, rngMod] = await Promise.all([loadEngine(), loadPark('schemas'), loadPark('rng')]);
  for (const target of [1, 3, 5]) {
    const engine = new FsmEngine(schemas.createCopierSchema({ rng: rngMod.createRng(7) }));
    try {
      expectTrue(!engine.send('COPY_REQUEST'), 'COPY_REQUEST rejected before idleFor', true);
      engine.context.dwell = engine.context.idleFor;
      expectTrue(engine.send('COPY_REQUEST'), 'COPY_REQUEST accepted', false);
      expectTrue(engine.send('ARRIVED'), 'ARRIVED accepted', false);
      expectEq(engine.getCurrentState(), 'PRINTING');
      engine.context.pagesTarget = target;
      let ticks = 0;
      let guard = 0;
      while (engine.getCurrentState() === 'PRINTING' && guard++ < 1000) {
        if (schemas.tickAgent(engine, 0.5)) ticks++;
      }
      expectEq(engine.getCurrentState(), 'DELIVERING');
      expectEq(ticks, target);
      expectEq(engine.context.pagesPrinted, target);
    } finally {
      engine.destroy();
    }
  }
});

check('[fsm:idle] 40 seeds: newbie/coffee/copier idleFor in [4,8] and each rests >= 4 s in IDLE', async () => {
  const [{ FsmEngine }, schemas, rngMod] = await Promise.all([loadEngine(), loadPark('schemas'), loadPark('rng')]);
  const STEP = 0.1;
  const make = { newbie: schemas.createNewbieSchema, coffee: schemas.createCoffeeSchema, copier: schemas.createCopierSchema };
  const leave = { newbie: 'WALKING_TO_BOSS', coffee: 'WALKING_TO_COOLER', copier: 'WALKING_TO_COPIER' };
  for (let seed = 1; seed <= 40; seed++) {
    for (const name of Object.keys(make)) {
      const tag = `${name} seed ${seed}`;
      const engine = new FsmEngine(make[name]({ rng: rngMod.createRng(seed) }));
      try {
        // Initial context (sim start) and the value drawn on a fresh IDLE entry (re-enter via a full loop for the copier path is
        // covered by schema onEnter; here we force it with a self-contained re-entry).
        const initial = engine.context.idleFor;
        expectTrue(initial >= 4 && initial <= 8, `${tag}: initial idleFor in [4,8]`, initial);
        for (let round = 0; round < 2; round++) {
          const idleFor = engine.context.idleFor;
          expectTrue(idleFor >= 4 && idleFor <= 8, `${tag}: idleFor in [4,8]`, idleFor);
          let t = 0;
          let moved = false;
          for (let i = 0; i < 200 && !moved; i++) {
            t += STEP;
            if (name === 'copier') {
              engine.context.dwell += STEP;
              moved = engine.send('COPY_REQUEST');
            } else {
              moved = schemas.tickAgent(engine, STEP);
            }
            if (moved) break;
          }
          expectEq(engine.getCurrentState(), leave[name]);
          expectTrue(t >= 4 - 1e-9, `${tag}: left IDLE no earlier than 4 s`, t);
          expectTrue(t <= 8 + STEP + 1e-9, `${tag}: left IDLE by 8 s + one step`, t);
          // Re-enter IDLE through the schema's own transitions to observe the onEnter draw.
          if (name === 'newbie') {
            engine.send('ARRIVED'); engine.send('REVIEW');
            while (engine.getCurrentState() !== 'IDLE' && engine.getCurrentState() !== 'RETURNING') schemas.tickAgent(engine, 0.5);
            engine.send('ARRIVED');
          } else if (name === 'coffee') {
            engine.send('ARRIVED'); schemas.tickAgent(engine, 2); engine.send('ARRIVED'); engine.send('ARRIVED');
            schemas.tickAgent(engine, 3);
          } else {
            engine.send('ARRIVED'); engine.context.pagesTarget = 1; schemas.tickAgent(engine, 1);
            engine.send('ARRIVED'); schemas.tickAgent(engine, 2);
          }
          expectEq(engine.getCurrentState(), 'IDLE');
        }
      } finally {
        engine.destroy();
      }
    }
  }
});
check('[audio:plan] planSeekSound: duration 2..3, >=6 seeks gap>=20ms, latch after last seek, motor descends', async () => {
  const [{ planSeekSound }, { createRng }] = await Promise.all([loadPark('audio-plan'), loadPark('rng')]);
  for (let seed = 1; seed <= 40; seed++) {
    const plan = planSeekSound(createRng(seed));
    const tag = `seed ${seed}`;
    expectTrue(plan.duration >= 2 && plan.duration <= 3, `${tag}: duration in [2,3]`, plan.duration);
    expectTrue(plan.seeks.length >= 6, `${tag}: >=6 seeks`, plan.seeks.length);
    for (let i = 1; i < plan.seeks.length; i++) {
      const gap = plan.seeks[i].t - plan.seeks[i - 1].t;
      expectTrue(gap >= 0.020 - 1e-12, `${tag}: seek gap >= 0.020`, gap);
    }
    const last = plan.seeks[plan.seeks.length - 1].t;
    expectTrue(plan.latch && plan.latch.t > last, `${tag}: latch after last seek`, `${plan.latch && plan.latch.t} <= ${last}`);
    expectTrue(plan.motor.startHz > plan.motor.endHz, `${tag}: motor startHz > endHz`, `${plan.motor.startHz}/${plan.motor.endHz}`);
  }
});

// ---------------------------------------------------------------- CHECKS: static
check('[static:pure] pure modules + audio.js have no DOM identifiers and import in Node', async () => {
  // FsmEngine#getContext() (no arguments) is the engine API, not canvas.getContext('2d'),
  // so only getContext with an argument counts.
  const banned = /\b(document|window|canvas)\b|\bgetContext\s*\(\s*[^\s)]/;
  for (const name of NO_DOM_MODULES) {
    const file = path.join(PARK_DIR, name + '.js');
    const hit = banned.exec(stripped(file));
    if (hit) throw new Mismatch(`${name}.js without ${banned}`, `found "${hit[0]}"`);
    await loadPark(name);
  }
});

check('[static:deps] no direct Math.random (except rng.js), no http(s) URLs, no fetch(, no image extensions', () => {
  const files = fs.readdirSync(PARK_DIR).filter((f) => f.endsWith('.js'));
  expectTrue(files.length > 0, 'src/park/*.js present', 0);
  const rules = [
    ['Math.random', /\bMath\s*\.\s*random\b/, (f) => f === 'rng.js'],
    ['http(s):// URL', /https?:\/\//i, () => false],
    ['fetch(', /\bfetch\s*\(/, () => false],
    ['image extension', /\.(png|jpe?g|gif|webp|svg)\b/i, () => false],
  ];
  for (const f of files) {
    const code = stripped(path.join(PARK_DIR, f));
    for (const [label, re, exempt] of rules) {
      if (!exempt(f) && re.test(code)) throw new Mismatch(`${f} without ${label}`, 'found');
    }
  }
});

check('[static:english] src/park/*.js and park.html contain no Hangul and no Malgun Gothic', () => {
  const files = fs.readdirSync(PARK_DIR).filter((f) => f.endsWith('.js')).map((f) => path.join(PARK_DIR, f));
  files.push(path.join(ROOT, 'park.html'));
  const hangul = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/;
  for (const file of files) {
    const text = readText(file);
    const h = hangul.exec(text);
    if (h) throw new Mismatch(`${path.basename(file)} without Hangul`, `found "${h[0]}"`);
    if (/Malgun Gothic/i.test(text)) throw new Mismatch(`${path.basename(file)} without Malgun Gothic`, 'found');
  }
});

check('[static:bezel] park.html: canvas#park-canvas inside a CRT bezel wrapper, 4/3 aspect-ratio, border-radius, no URLs', () => {
  const html = readText(path.join(ROOT, 'park.html'));
  const m = /<div[^>]*id="park-monitor"[^>]*>([\s\S]*?)<script/i.exec(html);
  expectTrue(!!m, 'monitor wrapper #park-monitor', 'not found');
  expectTrue(/<canvas\b[^>]*id="park-canvas"/i.test(m[1]), 'canvas#park-canvas nested in #park-monitor', 'not nested');
  expectTrue(/<div[^>]*id="park-screen"[^>]*>\s*<canvas\b[^>]*id="park-canvas"/i.test(m[1]),
    'canvas inside #park-screen', 'not found');
  expectTrue(/aspect-ratio\s*:\s*4\s*\/\s*3/.test(html), 'aspect-ratio: 4 / 3', 'missing');
  expectTrue(/border-radius\s*:/.test(html), 'border-radius', 'missing');
  expectTrue(/id="park-error"/.test(html) && /<noscript>/.test(html), '#park-error and <noscript> kept', 'missing');
  expectTrue(!/https?:\/\//i.test(html), 'no external URLs', 'found');
  expectTrue(!/[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(html), 'no Hangul', 'found');
  expectTrue(!/Malgun Gothic/i.test(html), 'no Malgun Gothic', 'found');
});

check('[static:dpr] main.js uses devicePixelRatio + computeScale (integer device-pixel scaling)', () => {
  const main = readText(path.join(PARK_DIR, 'main.js'));
  expectTrue(/devicePixelRatio/.test(main), 'main.js references devicePixelRatio', 'missing');
  expectTrue(/getBoundingClientRect/.test(main), 'main.js measures the screen box', 'missing');
  expectTrue(/computeScale/.test(main), 'main.js uses computeScale', 'missing');
  const render = readText(path.join(PARK_DIR, 'render.js'));
  expectTrue(/computeScale\(/.test(render), 'render.js uses computeScale', 'missing');
  const sm = readText(path.join(PARK_DIR, 'scene-math.js'));
  expectTrue(/Math\.floor\(/.test(sm) && /export function computeScale/.test(sm), 'computeScale floors to integers', 'missing');
});

// ---------------------------------------------------------------- CHECKS: audit
check('[audit:audio-gesture] AudioContext only created on unlock(); failures never throw or reject unhandled', async () => {
  const [{ createAudio }, { planSeekSound }, { createRng }] =
    await Promise.all([loadPark('audio'), loadPark('audio-plan'), loadPark('rng')]);
  const plan = planSeekSound(createRng(7));

  const makeEnv = (opts = {}) => {
    const env = { ctors: 0, nodes: 0, resumes: 0, timers: new Map(), nextTimer: 1 };
    const node = () => {
      env.nodes++;
      const param = { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} };
      return {
        gain: param, frequency: param, type: '', buffer: null, loop: false,
        connect() {}, disconnect() {}, start() {}, stop() {},
      };
    };
    env.Ctor = class FakeAudioContext {
      constructor() {
        env.ctors++;
        if (opts.throwCtor) throw new Error('ctor boom');
        this.state = 'suspended';
        this.currentTime = 0;
        this.sampleRate = 44100;
        this.destination = {};
      }
      createGain() { return node(); }
      createOscillator() { return node(); }
      createBiquadFilter() { return node(); }
      createBufferSource() { return node(); }
      createBuffer(c, len) { env.nodes++; return { getChannelData: () => new Float32Array(len) }; }
      resume() {
        env.resumes++;
        return opts.rejectResume ? Promise.reject(new Error('resume denied')) : Promise.resolve();
      }
    };
    env.setTimeout = (fn) => { const id = env.nextTimer++; env.timers.set(id, fn); return id; };
    env.clearTimeout = (id) => { env.timers.delete(id); };
    env.audio = createAudio({ AudioContextCtor: env.Ctor, setTimeout: env.setTimeout, clearTimeout: env.clearTimeout });
    return env;
  };
  const exercise = (a) => { a.playSeek(plan); a.sfx('stamp'); a.sfx('blip'); a.sfx('copy'); };
  const tick = () => new Promise((r) => setImmediate(r));

  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    // Locked: no constructor calls, no nodes.
    const a = makeEnv();
    expectEq(a.ctors, 0);
    exercise(a.audio);
    expectEq(a.ctors, 0);
    expectEq(a.nodes, 0);
    expectEq(a.audio.isUnlocked(), false);

    // Unlock creates exactly one context; repeated unlock stays at one.
    a.audio.unlock();
    expectEq(a.ctors, 1);
    a.audio.unlock();
    expectEq(a.ctors, 1);
    expectEq(a.audio.isUnlocked(), true);
    exercise(a.audio);
    expectTrue(a.nodes > 0, 'nodes created while unlocked and unmuted', a.nodes);
    expectTrue(a.timers.size > 0, 'cleanup timers scheduled via injected setTimeout', a.timers.size);

    // Muted: no new nodes.
    a.audio.setMuted(true);
    const before = a.nodes;
    exercise(a.audio);
    expectEq(a.nodes, before);

    // Throwing constructor.
    const b = makeEnv({ throwCtor: true });
    b.audio.unlock();
    exercise(b.audio);
    expectEq(b.audio.isUnlocked(), false);
    expectEq(b.nodes, 0);

    // Rejecting resume().
    const c = makeEnv({ rejectResume: true });
    c.audio.unlock();
    exercise(c.audio);
    await tick();
    await tick();
    expectEq(c.ctors, 1);
    expectTrue(c.resumes >= 1, 'resume() attempted', c.resumes);

    expectEq(unhandled.length, 0);
  } finally {
    process.removeListener('unhandledRejection', onUnhandled);
  }
});

// ---------------------------------------------------------------- CHECKS: files
check('[static:files] park.html, src/park modules, scripts, run_all, links, pages.yml', () => {
  const missing = [];
  const need = (rel) => { if (!fs.existsSync(path.join(ROOT, rel))) missing.push(rel); };
  need('park.html');
  for (const m of ['constants', 'rng', 'sprites', 'schemas', 'bubbles', 'sim', 'loop', 'boot',
    'audio-plan', 'scene-math', 'audio', 'render', 'main']) need('src/park/' + m + '.js');
  need('src/park/package.json');
  need('tests/run_all.js');
  expectEq(missing.join(', '), '');

  const pkg = JSON.parse(readText(path.join(ROOT, 'package.json')));
  const scripts = pkg.scripts || {};
  expectTrue(typeof scripts.test === 'string' && scripts.test.length > 0, 'scripts.test', scripts.test);
  expectTrue(typeof scripts['test:park'] === 'string' && scripts['test:park'].length > 0,
    'scripts.test:park', scripts['test:park']);
  expectTrue(scripts.test.includes('run_all.js') ||
    (scripts.test.includes('verify_chrono.js') && scripts.test.includes('verify_park.js')),
  'test script references run_all.js or both verifiers', scripts.test);

  const index = readText(path.join(ROOT, 'index.html'));
  expectTrue(/<a\b[^>]*\bhref\s*=\s*["']\.?\/?park\.html["']/i.test(index),
    '<a href="park.html"> in index.html', 'not found');

  const pages = readText(path.join(ROOT, '.github', 'workflows', 'pages.yml'));
  expectTrue(pages.includes('cp park.html'), 'pages.yml contains "cp park.html"', 'not found');
  expectTrue(pages.includes('verify_park.js'), 'pages.yml contains "verify_park.js"', 'not found');

  const park = readText(path.join(ROOT, 'park.html'));
  const urls = park.match(/https?:\/\/[^\s"'<>)]+/gi) || [];
  expectEq(urls.join(', '), '');
});

// ---------------------------------------------------------------- CHECKS: hooks
check('[hooks] 4 park hooks are valid JSON with name/when/then; verify-chrono hook kept', () => {
  const dir = path.join(ROOT, '.kiro', 'hooks');
  for (const id of ['park-save-verify', 'park-engine-guard', 'park-run-all-tests', 'park-structure-audit']) {
    const file = path.join(dir, id + '.kiro.hook');
    expectTrue(fs.existsSync(file), id + ' exists', 'missing');
    let h;
    try { h = JSON.parse(readText(file)); } catch (e) { throw new Mismatch(id + ' valid JSON', e.message); }
    const str = (v) => typeof v === 'string' && v.trim().length > 0;
    expectTrue(str(h.name), id + ' name non-empty', h.name);
    expectTrue(h.when && str(h.when.type), id + ' when.type non-empty', JSON.stringify(h.when));
    expectTrue(h.then && str(h.then.type), id + ' then.type non-empty', JSON.stringify(h.then));
    expectTrue(h.then && str(h.then.prompt), id + ' then.prompt non-empty', 'empty');
  }
  expectTrue(fs.existsSync(path.join(dir, 'verify-chrono.kiro.hook')), 'verify-chrono.kiro.hook exists', 'missing');
});

// (All planned checks appended: [static:files], [hooks])

// ---------------------------------------------------------------- runner
async function main() {
  const results = [];
  for (const { name, fn } of registry) {
    let result;
    try {
      await fn();
      result = { name, pass: true };
    } catch (err) {
      if (err instanceof Mismatch) {
        result = { name, pass: false, expected: err.expected, actual: err.actual };
      } else {
        result = {
          name,
          pass: false,
          expected: 'no exception',
          actual: (err && err.stack ? String(err.message || err) : String(err)),
        };
      }
    }
    results.push(result);
    console.log(formatCheck(result));
  }
  const summary = summarize(results);
  console.log(formatSummary(summary));
  process.exitCode = summary.exitCode;
}

main().catch((err) => {
  console.log('FAIL [verifier:internal] | expected: no exception | actual: ' + String(err && err.message).replace(/\s+/g, ' '));
  console.log('SUMMARY total=1 pass=0 fail=1');
  process.exitCode = 1;
});
