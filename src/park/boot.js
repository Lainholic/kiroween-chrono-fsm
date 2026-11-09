// PARK.EXE boot screen model. Pure module: no DOM, window, or canvas references.

export const PROMPT = 'C:\\>';
export const MAX_INPUT = 64;                 // Req 1.2
export const HINT_AFTER_SEC = 5;             // Req 1.7
export const BOOT_LINES = Object.freeze([
  { t: 0.0, text: 'BIOS Memory Check: 640K OK' },
  { t: 0.5, text: 'MS-DOS Version 6.22' },
  { t: 1.0, text: PROMPT, prompt: true }
]);
export const BAD_COMMAND = 'Bad command or file name';
export const HINT_TEXT = 'Type PARK to begin';

export function isParkCommand(line) {
  if (typeof line !== 'string') return false;
  const s = line.trim().toUpperCase();
  return s === 'PARK' || s === 'PARK.EXE';
}

function isPrintable(ch) {
  if (typeof ch !== 'string') return false;
  const cps = Array.from(ch);
  if (cps.length !== 1) return false;
  const c = cps[0].codePointAt(0);
  return c >= 0x20 && c !== 0x7f && !(c >= 0x80 && c <= 0x9f);
}

export function createBootModel() {
  let shown = 0;          // number of BOOT_LINES already shown
  let promptIndex = -1;   // index in lines of the active prompt line

  const model = {
    lines: [],
    input: '',
    elapsed: 0,
    idleSec: 0,
    hintShown: false,

    typeChar(ch) {
      model.idleSec = 0;
      if (!isPrintable(ch)) return;
      if (Array.from(model.input).length >= MAX_INPUT) return;
      model.input += ch;
    },

    backspace() {
      model.idleSec = 0;
      if (model.input.length === 0) return;
      const cps = Array.from(model.input);
      cps.pop();
      model.input = cps.join('');
    },

    enter() {
      model.idleSec = 0;
      const typed = model.input;
      const park = isParkCommand(typed);
      model.input = '';
      if (promptIndex < 0) return { action: park ? 'PARK' : null };
      // Commit the typed text onto the prompt line, then add follow-up lines.
      model.lines[promptIndex] = PROMPT + typed;
      if (park) return { action: 'PARK' };
      if (typed.trim() !== '') model.lines.push(BAD_COMMAND);
      model.lines.push(PROMPT);
      promptIndex = model.lines.length - 1;
      model.hintShown = false;   // prompt refreshed: hint may show once again
      return { action: null };
    },

    pointer() {
      model.idleSec = 0;
      return { action: 'PARK' };
    },

    update(dtSec) {
      if (!(dtSec > 0)) return;
      model.elapsed += dtSec;
      while (shown < BOOT_LINES.length && model.elapsed >= BOOT_LINES[shown].t) {
        const entry = BOOT_LINES[shown];
        model.lines.push(entry.text);
        if (entry.prompt) {
          promptIndex = model.lines.length - 1;
          model.idleSec = Math.max(0, model.elapsed - entry.t);
        }
        shown++;
      }
      if (promptIndex >= 0 && shown === BOOT_LINES.length) {
        // idle time is counted from prompt display; the crossing frame set it above
        if (model.elapsed - dtSec >= BOOT_LINES[BOOT_LINES.length - 1].t) {
          model.idleSec += dtSec;
        }
        if (!model.hintShown && model.idleSec >= HINT_AFTER_SEC) {
          model.lines.push(HINT_TEXT);
          model.hintShown = true;
        }
      }
    }
  };
  return model;
}
