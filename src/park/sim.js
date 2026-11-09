// PARK.EXE simulation. Pure module: no DOM, window, or canvas references.
// Owns four agent FsmEngines, movement, a notification queue and collaboration reactions.
import { FsmEngine } from '../core/fsm-engine.js';
import {
  createBossSchema, createNewbieSchema, createCopierSchema, createCoffeeSchema, tickAgent
} from './schemas.js';
import { createBubbleStore } from './bubbles.js';
import { moveToward } from './scene-math.js';
import { ANCHORS, SPEED, ARRIVE_EPS, MAX_FRAME_SEC } from './constants.js';

const MAX_QUEUE_PER_FRAME = 64;
const AGENT_IDS = ['boss', 'newbie', 'copier', 'coffee'];

export function createSimulation({ rng }) {
  const deps = { rng };
  const schemas = {
    boss: createBossSchema(deps),
    newbie: createNewbieSchema(deps),
    copier: createCopierSchema(deps),
    coffee: createCoffeeSchema(deps)
  };
  const startPos = {
    boss:   { x: 152, y: 28 },
    newbie: { x: ANCHORS.newbieStart.x, y: ANCHORS.newbieStart.y },
    copier: { x: ANCHORS.copierFront.x, y: ANCHORS.copierFront.y },
    coffee: { x: ANCHORS.rackFront.x,   y: ANCHORS.rackFront.y }
  };

  // Queue items: { kind: 'state', agentId, state, prev, event } | { kind: 'send', agentId, event }
  const queue = [];
  const agents = {};
  const unsubs = [];

  for (const id of AGENT_IDS) {
    const engine = new FsmEngine(schemas[id]);
    agents[id] = {
      id, engine,
      pos: { ...startPos[id] },
      target: null,
      dir: 1,
      moving: false,
      walkTime: 0
    };
    // Listener signature: (current, previous, context, event). Only enqueue; never send().
    const off = engine.onStateChange((state, prev, _ctx, event) => {
      queue.push({ kind: 'state', agentId: id, state, prev, event });
    });
    if (typeof off === 'function') unsubs.push(off);
  }

  const bubbles = createBubbleStore();
  let destroyed = false;

  const sim = {
    time: 0,
    agents,
    bubbles,
    pendingCopyJobs: 0,
    update,
    destroy
  };

  function send(agentId, event) {
    queue.push({ kind: 'send', agentId, event });
  }

  function applyNotification(n) {
    if (n.prev === n.state) return;   // self transition: no entry effects
    const agent = agents[n.agentId];
    const cfg = schemas[n.agentId].states[n.state] || {};
    if (cfg.say) bubbles.show(n.agentId, cfg.say, sim.time);
    if (cfg.walkTo) {
      const a = ANCHORS[cfg.walkTo];
      agent.target = a ? { x: a.x, y: a.y } : null;
    } else {
      agent.target = null;
    }
    if (n.agentId === 'newbie') {
      if (n.state === 'SUBMITTING') send('boss', 'NEWBIE_SUBMITTED');
      else if (n.state === 'APPROVED') { send('boss', 'RESULT_APPROVED'); sim.pendingCopyJobs += 1; }
      else if (n.state === 'REJECTED') send('boss', 'RESULT_REJECTED');
      else if (n.state === 'RETURNING') send('boss', 'NEWBIE_RETURNING');
    } else if (n.agentId === 'coffee' && n.state === 'RECHARGING' && n.prev === 'SERVING') {
      bubbles.show('boss', '커피 좋아', sim.time);
    }
  }

  function move(agent, dt) {
    if (!agent.target || SPEED[agent.id] <= 0) {
      agent.moving = false;
      agent.walkTime = 0;
      return;
    }
    const dx = agent.target.x - agent.pos.x;
    if (Math.abs(dx) > 1e-9) agent.dir = dx > 0 ? 1 : -1;
    const r = moveToward(agent.pos, agent.target, SPEED[agent.id], dt);
    agent.pos.x = r.x;
    agent.pos.y = r.y;
    const dist = Math.hypot(agent.target.x - r.x, agent.target.y - r.y);
    if (r.arrived || dist <= ARRIVE_EPS) {
      agent.pos.x = agent.target.x;
      agent.pos.y = agent.target.y;
      agent.target = null;
      agent.moving = false;
      agent.walkTime = 0;
      send(agent.id, 'ARRIVED');
    } else {
      agent.moving = true;
      agent.walkTime += dt;
    }
  }

  function update(dtSec) {
    if (destroyed) return;
    let dt = Number.isFinite(dtSec) ? dtSec : 0;
    dt = Math.max(0, Math.min(dt, MAX_FRAME_SEC));
    sim.time += dt;

    // 1. movement
    for (const id of AGENT_IDS) move(agents[id], dt);

    // 2. dwell ticks
    for (const id of AGENT_IDS) tickAgent(agents[id].engine, dt);

    // 3. collaboration checks
    const boss = agents.boss.engine;
    const bctx = boss.getContext();
    if (boss.getCurrentState() === 'REVIEWING' && bctx.dwell >= 1.0 && !bctx.reviewSent) {
      bctx.reviewSent = true;
      send('newbie', 'REVIEW');
    }
    if (sim.pendingCopyJobs > 0 && agents.copier.engine.getCurrentState() === 'IDLE') {
      sim.pendingCopyJobs -= 1;
      send('copier', 'COPY_REQUEST');
    }

    // 4. drain queue
    let processed = 0;
    while (queue.length > 0 && processed < MAX_QUEUE_PER_FRAME) {
      const item = queue.shift();
      processed += 1;
      if (item.kind === 'send') agents[item.agentId].engine.send(item.event);
      else applyNotification(item);
    }

    // 5. bubbles
    bubbles.update(sim.time);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    const errors = [];
    for (const id of AGENT_IDS) {
      try { agents[id].engine.destroy(); } catch (e) { errors.push(e); }
    }
    queue.length = 0;
    return undefined;
  }

  return sim;
}
