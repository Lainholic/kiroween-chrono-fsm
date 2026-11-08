/**
 * Chrono-FSM Core Engine (The Skeleton Foundation)
 * Zero-dependency, pure TypeScript finite state machine with:
 * - State lifecycle hooks (onEnter, onExit)
 * - Deterministic transitions with guard conditions
 * - Probabilistic branching (e.g. 50/50 Gift vs Monster)
 * - Time-series buildup timers (automatic state transitions)
 * - 0-Bit URL Hash serialization / restoration
 *
 * NOTE: This file is the typed twin of `fsm-engine.js`. The runtime logic is
 * kept line-for-line identical; only type annotations differ.
 */

// Ambient declarations so the file compiles without DOM or @types/node.
declare const window: any;
declare const btoa: (data: string) => string;
declare const atob: (data: string) => string;
declare const Buffer: any;

export interface Transition<TContext = any> {
  event: string;
  target: string;
  /** Optional guard condition: return true to allow transition */
  guard?: (context: TContext, eventPayload?: any) => boolean;
  /** Optional probability weight (0.0 to 1.0) for randomized outcomes */
  probability?: number;
  /** Optional action callback executed during transition */
  action?: (context: TContext, eventPayload?: any) => void;
}

export interface StateConfig<TContext = any> {
  id?: string;
  name?: string;
  description?: string;
  onEnter?: (context: TContext) => void;
  onExit?: (context: TContext) => void;
  transitions?: Transition<TContext>[];
  /** Automatic timeout transition after T milliseconds */
  timeout?: {
    durationMs: number;
    targetState: string;
    onTimeout?: (context: TContext) => void;
  };
}

export interface FsmSchema<TContext = any> {
  id: string;
  name?: string;
  initialState: string;
  context?: TContext;
  states: Record<string, StateConfig<TContext>>;
}

export interface HistoryEntry {
  state: string;
  timestamp: number;
  event?: string;
}

export type StateChangeListener<TContext = any> = (
  currentState: string,
  previousState: string | null,
  context: TContext,
  eventTriggered?: string
) => void;

export class FsmEngine<TContext = any> {
  schema: FsmSchema<TContext>;
  context: TContext;
  currentStateId: string;
  previousStateId: string | null;
  listeners: Set<StateChangeListener<TContext>>;
  activeTimer: any;
  history: HistoryEntry[];

  constructor(schema: FsmSchema<TContext>) {
    this.schema = schema;
    this.context = JSON.parse(JSON.stringify(schema.context || {}));
    this.currentStateId = schema.initialState;
    this.previousStateId = null;
    this.listeners = new Set();
    this.activeTimer = null;
    this.history = [];

    this.enterState(this.currentStateId);
  }

  getCurrentState(): string {
    return this.currentStateId;
  }

  getContext(): TContext {
    return this.context;
  }

  updateContext(updater: (ctx: TContext) => void): void {
    updater(this.context);
  }

  onStateChange(listener: StateChangeListener<TContext>): () => boolean {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(event: string, payload?: any): boolean {
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

  resolveProbabilisticTransition(candidates: Transition<TContext>[]): Transition<TContext> {
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

  transitionTo(targetStateId: string, eventTriggered?: string): void {
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

  enterState(stateId: string, eventTriggered?: string): void {
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

  clearTimer(): void {
    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
  }

  /** 0-Bit State Persistence: encode snapshot into a compact URL hash string */
  toHashString(): string {
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

  /** Restore state machine from a compact URL hash string */
  static fromHashString<T>(schema: FsmSchema<T>, hash: string): FsmEngine<T> {
    try {
      let jsonStr: string;
      if (typeof window !== 'undefined' && window.atob) {
        jsonStr = decodeURIComponent(atob(hash));
      } else {
        jsonStr = Buffer.from(hash, 'base64').toString('utf8');
      }
      const parsed = JSON.parse(jsonStr);
      const engine = new FsmEngine<T>(schema);
      engine.context = parsed.c;
      engine.transitionTo(parsed.s, "RESTORED_FROM_HASH");
      return engine;
    } catch (e) {
      return new FsmEngine<T>(schema);
    }
  }

  destroy(): void {
    this.clearTimer();
    this.listeners.clear();
  }
}