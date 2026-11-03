#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// The data-free core entry has a hard product budget. The root entry includes
// the built-in dataset, so it is only guarded against regressions.
const CORE_BUDGET = 15 * 1024;
// Measured root size at the time this budget was introduced: 86,493 bytes
// gzipped. The extra headroom absorbs small zlib/minifier differences.
const ROOT_BUDGET = 90 * 1024;

const root = path.resolve(__dirname, '..');

const entries = [
  { label: 'core', file: 'lib/core.js', budget: CORE_BUDGET },
  { label: 'root', file: 'lib/index.js', budget: ROOT_BUDGET },
];

const formatSize = (bytes) => `${(bytes / 1024).toFixed(2)} KiB (${bytes} bytes)`;

let failed = false;

for (const entry of entries) {
  const absolutePath = path.join(root, entry.file);

  if (!fs.existsSync(absolutePath)) {
    console.error(`${entry.label}: missing ${entry.file}. Run \`npm run build\` first.`);
    failed = true;
    continue;
  }

  const gzipped = zlib.gzipSync(fs.readFileSync(absolutePath)).length;
  console.log(
    `${entry.label}: ${entry.file} ${formatSize(gzipped)} gzip, budget ${formatSize(entry.budget)}`,
  );

  if (gzipped > entry.budget) {
    console.error(
      `${entry.label}: ${entry.file} exceeds its gzip budget by ${gzipped - entry.budget} bytes.`,
    );
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
}
