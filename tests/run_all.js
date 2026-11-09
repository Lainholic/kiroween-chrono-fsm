'use strict';
// Runs both verifiers as child processes. Always runs both, exits 1 if either fails.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const suites = [
  { title: 'Chrono-FSM (verify_chrono.js)', file: path.join(__dirname, 'verify_chrono.js') },
  { title: 'PARK.EXE (verify_park.js)', file: path.join(__dirname, 'verify_park.js') },
];

const results = [];
for (const suite of suites) {
  console.log(`\n=== ${suite.title} ===`);
  const r = spawnSync(process.execPath, [suite.file], { cwd: root, stdio: 'inherit' });
  const code = r.status === null ? 1 : r.status;
  if (r.error) console.error(`failed to launch: ${r.error.message}`);
  console.log(`--- exit code: ${code}${r.signal ? ` (signal ${r.signal})` : ''}`);
  results.push({ title: suite.title, code });
}

console.log('\n=== Summary ===');
for (const r of results) console.log(`${r.code === 0 ? 'PASS' : 'FAIL'}  ${r.title} (exit ${r.code})`);

process.exit(results.every((r) => r.code === 0) ? 0 : 1);
