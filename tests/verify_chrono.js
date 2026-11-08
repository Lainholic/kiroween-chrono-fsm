/**
 * Automated Verification Script for Chrono-FSM (Kiroween Skeleton Crew Track)
 * Validates FSM Core engine logic, Canvas 2D renderers, particle physics, and FSM node graph.
 */
const fs = require('fs');
const path = require('path');

console.log('🔍 [Kiro Automated Verifier] Checking Chrono-FSM High-End Build...');

const enginePath = path.join(__dirname, '../src/core/fsm-engine.js');
const appHtmlPath = path.join(__dirname, '../index.html');

let failed = 0;

// 1. File Existence Checks
if (!fs.existsSync(enginePath)) {
  console.error('❌ FAIL: fsm-engine.js not found at ' + enginePath);
  failed++;
} else {
  console.log('  ✅ PASS: Core engine file exists (src/core/fsm-engine.js)');
}

if (!fs.existsSync(appHtmlPath)) {
  console.error('❌ FAIL: index.html not found at ' + appHtmlPath);
  failed++;
} else {
  console.log('  ✅ PASS: Chrono-FSM app HTML exists (index.html)');
}

// 2. FSM Core Engine Unit Invariants
try {
  const { FsmEngine } = require(enginePath);
  
  const testSchema = {
    id: 'test-prob',
    name: 'Probability Test',
    initialState: 'READY',
    context: { treats: 0, tricks: 0 },
    states: {
      READY: {
        transitions: [
          { event: 'POP', target: 'TREAT', probability: 0.5, action: (ctx) => { ctx.treats++; } },
          { event: 'POP', target: 'TRICK', probability: 0.5, action: (ctx) => { ctx.tricks++; } }
        ]
      },
      TREAT: { transitions: [{ event: 'RESET', target: 'READY' }] },
      TRICK: { transitions: [{ event: 'RESET', target: 'READY' }] }
    }
  };

  let treatCount = 0;
  let trickCount = 0;
  for (let i = 0; i < 200; i++) {
    const fsm = new FsmEngine(testSchema);
    fsm.send('POP');
    if (fsm.getCurrentState() === 'TREAT') treatCount++;
    if (fsm.getCurrentState() === 'TRICK') trickCount++;
  }

  if (treatCount > 50 && trickCount > 50) {
    console.log(`  ✅ PASS: 50/50 Probabilistic Branching Verified (Treats: ${treatCount}, Tricks: ${trickCount} out of 200)`);
  } else {
    console.error(`  ❌ FAIL: Probabilistic distribution skewed! (Treats: ${treatCount}, Tricks: ${trickCount})`);
    failed++;
  }

  const hashFsm = new FsmEngine(testSchema);
  hashFsm.send('POP');
  const hash = hashFsm.toHashString();
  const restored = FsmEngine.fromHashString(testSchema, hash);
  if (restored.getCurrentState() === hashFsm.getCurrentState()) {
    console.log('  ✅ PASS: 0-Bit URL Hash Serialization and Restoration Verified');
  } else {
    console.error('  ❌ FAIL: State restoration failed!');
    failed++;
  }
} catch (e) {
  console.error('  ❌ FAIL: Engine execution error:', e.message);
  failed++;
}

// 3. Static & Visual Polish Checks on index.html
if (fs.existsSync(appHtmlPath)) {
  const html = fs.readFileSync(appHtmlPath, 'utf8');

  const baselineChecks = [
    { name: 'FSM Engine Script Import / Loading', test: html.includes('fsm-engine.js') || html.includes('FsmEngine') },
    { name: 'App 1 (Neon Focus Clock) Container', test: html.includes('clock-app') },
    { name: 'App 2 (Halloween Jack-in-the-Box) Container', test: html.includes('box-app') },
    { name: 'Clock FSM States (IDLE, FOCUSING, PAUSED, BREAK)', test: html.includes('FOCUSING') && html.includes('PAUSED') && html.includes('BREAK') },
    { name: 'Box FSM Tension States (WINDING_1, WINDING_2, READY_TO_POP)', test: html.includes('WINDING_1') && html.includes('WINDING_2') && html.includes('READY_TO_POP') },
    { name: '50/50 Outcomes (POPPED_TREAT, POPPED_TRICK)', test: html.includes('POPPED_TREAT') && html.includes('POPPED_TRICK') },
    { name: 'Web Audio API Sound Engine', test: html.includes('AudioContext') },
    { name: 'Tab Switcher UI', test: html.includes('switchTab') },
    { name: 'Active FSM Engine Instance Usage (new FsmEngine / .send)', test: html.includes('new FsmEngine') && html.includes('.send(') }
  ];

  for (const check of baselineChecks) {
    if (check.test) {
      console.log(`  ✅ PASS: ${check.name}`);
    } else {
      console.log(`  ❌ FAIL: ${check.name}`);
      failed++;
    }
  }

  // Visual Polish & High-End Invariants (Task 6 & 7)
  console.log('\n🎨 Checking Visual Polish & High-End Rendering Invariants...');
  const visualChecks = [
    { name: 'Clock Canvas Gauge (<canvas id="clock-canvas">)', test: html.includes('id="clock-canvas"') },
    { name: 'Box Procedural Canvas (<canvas id="box-canvas">)', test: html.includes('id="box-canvas"') },
    { name: 'FSM Interactive Node Graph Canvas (<canvas id="fsm-graph-canvas">)', test: html.includes('id="fsm-graph-canvas"') },
    { name: 'Unified 60 FPS requestAnimationFrame Loop', test: html.includes('requestAnimationFrame') },
    { name: 'Particle Burst System (particles / confetti / sparks)', test: html.includes('particles') || html.includes('confetti') || html.includes('burst') },
    { name: 'Neon Arc Multi-pass Blur Rendering (shadowBlur / arc)', test: html.includes('shadowBlur') && html.includes('.arc(') },
    { name: 'Oscilloscope Focus Waveform or Sine Pulse', test: html.includes('Math.sin') && (html.includes('waveform') || html.includes('pulse') || html.includes('wave')) }
  ];

  for (const check of visualChecks) {
    if (check.test) {
      console.log(`  ✅ PASS: ${check.name}`);
    } else {
      console.log(`  ❌ FAIL: ${check.name}`);
      failed++;
    }
  }

  // App 3: Haunted Vending Machine (Task 9): static + behavioral checks on the real engine
  console.log('\n?? Checking App 3: Haunted Vending Machine...');
  const checkVend = (name, ok) => {
    if (ok) console.log(`  ? PASS: ${name}`);
    else { console.log(`  ? FAIL: ${name}`); failed++; }
  };
  checkVend('App 3 container and canvas (vend-app, vend-canvas)', html.includes('id="vend-app"') && html.includes('id="vend-canvas"'));
  checkVend('Vending FSM States (HAS_COIN, DISPENSED, JAMMED, HAUNTED)', ['HAS_COIN', 'DISPENSED', 'JAMMED', 'HAUNTED'].every((s) => html.includes(s)));
  checkVend('Third engine instance (new FsmEngine(vendSchema))', html.includes('new FsmEngine(vendSchema)'));
  checkVend('Engine stays app-agnostic (no clock/box/vending/canvas/audio code in fsm-engine.js)',
    !/vend|clock|canvas|AudioContext|jack/i.test(fs.readFileSync(enginePath, 'utf8')));
  try {
    const m = html.match(/\/\/ <schema:vending>([\s\S]*?)\/\/ <\/schema:vending>/);
    if (!m) throw new Error('schema markers not found in index.html');
    const { FsmEngine: Engine } = require(enginePath);
    const vendSchema = new Function(m[1] + '\nreturn vendSchema;')();
    const fresh = () => new Engine(vendSchema);

    const e0 = fresh();
    checkVend('Guard: SELECT is rejected with 0 coins (send() returns false)', e0.send('SELECT', { slot: 0 }) === false && e0.getCurrentState() === 'IDLE');
    e0.send('COIN');
    checkVend('Guard: SELECT is rejected with 1 coin', e0.send('SELECT', { slot: 0 }) === false && e0.getCurrentState() === 'HAS_COIN');
    e0.send('COIN'); e0.send('COIN');
    checkVend('Guard: coin slot caps at 3 coins', e0.send('COIN') === false && e0.getContext().coins === 3);

    const counts = { DISPENSED: 0, JAMMED: 0, HAUNTED: 0 };
    const TRIALS = 600;
    for (let i = 0; i < TRIALS; i++) {
      const e = fresh(); e.send('COIN'); e.send('COIN'); e.send('SELECT', { slot: i % 3 });
      counts[e.getCurrentState()]++;
      e.destroy();
    }
    const near = (n, p) => Math.abs(n / TRIALS - p) < 0.08;
    checkVend(`Weighted branch 60/25/15 (Dispensed ${counts.DISPENSED}, Jammed ${counts.JAMMED}, Haunted ${counts.HAUNTED} of ${TRIALS})`,
      near(counts.DISPENSED, 0.60) && near(counts.JAMMED, 0.25) && near(counts.HAUNTED, 0.15));

    let freed = 0, jams = 0;
    for (let i = 0; i < 200 && jams < 40; i++) {
      const e = fresh(); e.send('COIN'); e.send('COIN'); e.send('SELECT', { slot: 1 });
      if (e.getCurrentState() !== 'JAMMED') { e.destroy(); continue; }
      jams++;
      for (let k = 0; k < 200 && e.getCurrentState() === 'JAMMED'; k++) e.send('KICK');
      if (e.getCurrentState() === 'DISPENSED') freed++;
      e.destroy();
    }
    checkVend(`Self transition: a jammed machine always frees eventually by kicking (${freed}/${jams})`, jams > 0 && freed === jams);

    checkVend('Timeouts configured: HAS_COIN, DISPENSED, HAUNTED return to IDLE',
      ['HAS_COIN', 'DISPENSED', 'HAUNTED'].every((s) => vendSchema.states[s].timeout && vendSchema.states[s].timeout.targetState === 'IDLE'));

    let j = fresh(); let g = 0;
    while (j.getCurrentState() !== 'JAMMED' && g++ < 500) {
      j.destroy(); j = fresh(); j.send('COIN'); j.send('COIN'); j.send('SELECT', { slot: 2 });
    }
    const back = Engine.fromHashString(vendSchema, j.toHashString());
    checkVend('Vending state + context survive the URL hash round trip', back.getCurrentState() === 'JAMMED' && back.getContext().slot === 2);
  } catch (e) {
    console.error('  ? FAIL: Vending behavioral tests crashed:', e.message);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n❌ Total Failures: ${failed}. Implement the high-end visual requirements in .kiro/specs/chrono-fsm/visual-polish-spec.md before marking tasks complete.`);
  process.exit(1);
} else {
  console.log('\n🎉 ALL HIGH-END VISUAL & STRUCTURAL INVARIANTS PASSED (100%)');
  process.exit(0);
}
