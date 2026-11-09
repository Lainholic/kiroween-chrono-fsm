'use strict';
// Pure helpers for the PARK.EXE verifier output. No I/O, no dependencies.

function clean(value) {
  let s;
  if (typeof value === 'string') s = value;
  else if (value === undefined) s = 'undefined';
  else {
    try {
      s = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (s === undefined) s = String(value);
    } catch (e) {
      s = String(value);
    }
  }
  return s.replace(/\r\n|\r|\n|\u2028|\u2029/g, ' ');
}

// Exactly one line: `PASS <name>` or `FAIL <name> | expected: <e> | actual: <a>`.
function formatCheck(result) {
  const r = result || {};
  const name = clean(r.name);
  if (r.pass) return 'PASS ' + name;
  return 'FAIL ' + name + ' | expected: ' + clean(r.expected) + ' | actual: ' + clean(r.actual);
}

function summarize(results) {
  const list = Array.isArray(results) ? results : [];
  const total = list.length;
  const pass = list.filter((r) => r && r.pass).length;
  const fail = total - pass;
  return { total, pass, fail, exitCode: fail > 0 ? 1 : 0 };
}

// `SUMMARY total=N pass=P fail=F`
function formatSummary(summary) {
  return 'SUMMARY total=' + summary.total + ' pass=' + summary.pass + ' fail=' + summary.fail;
}

module.exports = { formatCheck, summarize, formatSummary };
