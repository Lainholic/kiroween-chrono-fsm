/**
 * Chrono-FSM Core Engine (The Skeleton Foundation)
 * Zero-dependency, pure JavaScript/ESM finite state machine with:
 * - State lifecycle hooks (onEnter, onExit)
 * - Deterministic transitions with guard conditions
 * - Probabilistic branching (e.g. 50/50 Gift vs Monster)
 * - Time-series buildup timers (automatic state transitions)
 * - 0-Bit URL Hash serialization / restoration
 */

export class FsmEngine {
  constructor(schema) {
    this.schema = schema;
    this.context = JSON.parse(JSON.stringify(schema.context || {}));
    this.currentStateId = schema.initialState;
    this.previousStateId = null;
    this.listeners = new Set();
    this.activeTimer = null;
    this.history = [];

    this.enterState(this.currentStateId);
  }

  getCurrentState() {
    return this.currentStateId;
  }

  getContext() {
    return this.context;
  }

  updateContext(updater) {
    updater(this.context);
  }

  onStateChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(event, payload) {
    const currentStateConfig = this.schema.states[this.currentStateId];
    if (!currentStateConfig || !currentStateConfig.transitions) {
      return false;
    }

    const candidates = currentStateConfig.transitions.filter((t) => {
      if (t.event !== event) return false;
      if (t.guard && !t.guard(this.context, payload)) return false;
      return true;
    });

    if (candidates.length === 0) {
      return false;
    }

    let chosenTransition = candidates[0];
    if (candidates.length > 1 || candidates.some((c) => c.probability !== undefined)) {
      chosenTransition = this.resolveProbabilisticTransition(candidates);
    }

    if (chosenTransition.action) {
      chosenTransition.action(this.context, payload);
    }

    this.transitionTo(chosenTransition.target, event);
    return true;
  }

  resolveProbabilisticTransition(candidates) {
    const hasProbabilities = candidates.some((c) => c.probability !== undefined);
    if (!hasProbabilities) {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      return candidates[randomIndex];
    }

    const rand = Math.random();
    let accumulated = 0;
    for (const cand of candidates) {
      const weight = cand.probability !== undefined ? cand.probability : (1.0 / candidates.length);
      accumulated += weight;
      if (rand <= accumulated) {
        return cand;
      }
    }
    return candidates[candidates.length - 1];
  }

  transitionTo(targetStateId, eventTriggered) {
    if (!this.schema.states[targetStateId]) {
      throw new Error(`Target state '${targetStateId}' not found in FSM schema '${this.schema.id}'`);
    }

    const currentConfig = this.schema.states[this.currentStateId];
    if (currentConfig?.onExit) {
      currentConfig.onExit(this.context);
    }
    this.clearTimer();

    this.previousStateId = this.currentStateId;
    this.currentStateId = targetStateId;
    this.enterState(targetStateId, eventTriggered);
  }

  enterState(stateId, eventTriggered) {
    const stateConfig = this.schema.states[stateId];
    this.history.push({ state: stateId, timestamp: Date.now(), event: eventTriggered });

    if (stateConfig?.onEnter) {
      stateConfig.onEnter(this.context);
    }

    if (stateConfig?.timeout) {
      const { durationMs, targetState, onTimeout } = stateConfig.timeout;
      this.activeTimer = setTimeout(() => {
        if (onTimeout) onTimeout(this.context);
        this.transitionTo(targetState, "TIMEOUT");
      }, durationMs);
    }

    for (const listener of this.listeners) {
      listener(this.currentStateId, this.previousStateId, this.context, eventTriggered);
    }
  }

  clearTimer() {
    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
  }

  toHashString() {
    const snapshot = {
      s: this.currentStateId,
      c: this.context,
      t: Date.now()
    };
    if (typeof window !== 'undefined' && window.btoa) {
      return btoa(encodeURIComponent(JSON.stringify(snapshot)));
    }
    return Buffer.from(JSON.stringify(snapshot)).toString('base64');
  }

  static fromHashString(schema, hash) {
    try {
      let jsonStr;
      if (typeof window !== 'undefined' && window.atob) {
        jsonStr = decodeURIComponent(atob(hash));
      } else {
        jsonStr = Buffer.from(hash, 'base64').toString('utf8');
      }
      const parsed = JSON.parse(jsonStr);
      const engine = new FsmEngine(schema);
      engine.context = parsed.c;
      engine.transitionTo(parsed.s, "RESTORED_FROM_HASH");
      return engine;
    } catch (e) {
      return new FsmEngine(schema);
    }
  }

  destroy() {
    this.clearTimer();
    this.listeners.clear();
  }
}

// UMD / CommonJS fallback for test scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FsmEngine };
}
