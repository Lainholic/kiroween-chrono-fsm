'use strict';
/**
 * Engine normalization helpers (park-exe task 6.3).
 * CommonJS, node: builtins only.
 *
 * normalizeRuntime(source, kind) yields a whitespace-free, runtime-only string so that
 * fsm-engine.js and fsm-engine.ts can be compared for identical runtime logic.
 */
const crypto = require('node:crypto');
const nodeModule = require('node:module');

/** CRLF / CR -> LF */
function normalizeLineEndings(text) {
  return String(text).replace(/\r\n?/g, '\n');
}

/** sha256 hex of the LF-normalized source */
function engineHash(source) {
  return crypto.createHash('sha256').update(normalizeLineEndings(source), 'utf8').digest('hex');
}

/**
 * Remove // and block comments without touching string, template or regex literals.
 * Template literals are tracked with a stack so `${ ... }` expressions are scanned as code.
 */
function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  // Stack of contexts: 'code' braces depth markers for template expressions.
  const tplStack = []; // each entry: brace depth inside current ${}
  let braceDepth = 0;
  let lastSig = ''; // last significant (non-space, non-comment) char emitted
  let lastWord = '';

  const regexAllowed = () => {
    if (lastSig === '') return true;
    if (/[)\]}\w$'"`]/.test(lastSig)) {
      // keywords after which a regex may start
      return /^(return|typeof|case|in|of|delete|void|throw|new|else|do|yield|await)$/.test(lastWord);
    }
    return true;
  };

  const readTemplate = () => {
    // assumes src[i] is just after an opening backtick or after a closing } of ${}
    while (i < n) {
      const c = src[i];
      if (c === '\\') { out += c + (src[i + 1] ?? ''); i += 2; continue; }
      if (c === '`') { out += c; i++; lastSig = '`'; lastWord = ''; return; }
      if (c === '$' && src[i + 1] === '{') {
        out += '${'; i += 2;
        tplStack.push(braceDepth);
        braceDepth = 0;
        return;
      }
      out += c; i++;
    }
  };

  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      out += ' ';
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
      lastSig = c; lastWord = '';
      continue;
    }
    if (c === '`') {
      out += c; i++;
      readTemplate();
      continue;
    }
    if (c === '/' && regexAllowed()) {
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        else if (src[j] === '/' && !inClass) break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/i.test(src[j])) j++;
      out += src.slice(i, j);
      i = j;
      lastSig = '/'; lastWord = '';
      continue;
    }
    if (c === '{') braceDepth++;
    if (c === '}') {
      if (tplStack.length && braceDepth === 0) {
        braceDepth = tplStack.pop();
        out += c; i++;
        readTemplate();
        continue;
      }
      braceDepth--;
    }
    if (/[\w$]/.test(c)) {
      lastWord = /[\w$]/.test(lastSig) && lastWord ? lastWord + c : c;
    } else if (!/\s/.test(c)) {
      lastWord = '';
    }
    if (!/\s/.test(c)) lastSig = c;
    out += c;
    i++;
  }
  return out;
}

/** Remove trailing CJS compat block: if (typeof module ... ) { module.exports = {...}; } */
function removeCjsCompat(src) {
  const re = /if\s*\(\s*typeof\s+module\s*!==\s*['"]undefined['"]\s*&&\s*module\.exports\s*\)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*$/;
  return src.replace(re, '');
}

/** Remove bare class field declarations (`name;`) left behind after type stripping. */
function removeClassFields(src) {
  return src
    .split('\n')
    .filter((line) => !/^\s*(?:(?:public|private|protected|readonly|static|declare)\s+)*[A-Za-z_$][\w$]*\s*[?!]?\s*;\s*$/.test(line))
    .join('\n');
}

function stripTypes(source) {
  if (typeof nodeModule.stripTypeScriptTypes !== 'function') {
    throw new Error(
      `normalizeRuntime: node:module.stripTypeScriptTypes is unavailable on Node ${process.version} ` +
      '(requires Node >= 22.13 / 23.2); cannot normalize TypeScript source'
    );
  }
  try {
    return nodeModule.stripTypeScriptTypes(source);
  } catch (e) {
    throw new Error(`normalizeRuntime: stripTypeScriptTypes failed: ${e && e.message ? e.message : e}`);
  }
}

function normalizeRuntime(source, kind) {
  if (kind !== 'js' && kind !== 'ts') {
    throw new Error(`normalizeRuntime: kind must be 'js' or 'ts', got ${JSON.stringify(kind)}`);
  }
  let text = normalizeLineEndings(source);
  if (kind === 'ts') {
    // Strip comments first so type stripping never sees odd comment content,
    // then strip types, then drop leftover field declarations.
    text = stripTypes(stripComments(text));
    text = removeClassFields(stripComments(text));
  } else {
    text = removeCjsCompat(stripComments(text));
  }
  return text.replace(/\s+/g, '');
}

module.exports = { normalizeLineEndings, engineHash, normalizeRuntime, stripComments };
