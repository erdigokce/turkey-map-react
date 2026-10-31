#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  createConsumer,
  createTempDir,
  packPackage,
  runNode,
  writeFile,
} = require('./test-utils');

const requiredFiles = [
  'package.json',
  'readme.md',
  'LICENSE',
  'lib/index.js',
  'lib/index.d.ts',
  'lib/Tooltip.js',
  'lib/Tooltip.d.ts',
  'lib/data/index.js',
  'lib/data/index.d.ts',
];

const forbiddenPrefixes = [
  'src/',
  '.idea/',
  '.github/',
  'coverage/',
  'scripts/',
  'tests/',
  'node_modules/',
];

const forbiddenFiles = [
  '.babelrc',
  '.versionrc.json',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'RELEASE.md',
  'jest.config.js',
  'jest.artifact.config.js',
  'jest.setup.js',
  'package-lock.json',
  'tsconfig.json',
  'webpack.config.js',
];

const cjsSmoke = `
'use strict';
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const pkg = require('turkey-map-react');
const TurkeyMap = pkg.default || pkg;

assert.equal(typeof TurkeyMap, 'function');

const html = renderToStaticMarkup(React.createElement(TurkeyMap));
assert.match(html, /id="svg-turkiye-haritasi"/);
assert.equal((html.match(/data-iladi=/g) || []).length, 81);

const hidden = renderToStaticMarkup(React.createElement(TurkeyMap, { visible: false }));
assert.match(hidden, /hidden/);

const tooltip = renderToStaticMarkup(
  React.createElement(TurkeyMap, { showTooltip: true, tooltipText: 'Package tooltip' }),
);
assert.match(tooltip, /Package tooltip/);

const styled = renderToStaticMarkup(
  React.createElement(TurkeyMap, {
    customStyle: { idleColor: '#123456', hoverColor: '#abcdef' },
  }),
);
assert.match(styled, /#123456/);

console.log('CJS package smoke passed.');
`;

const esmSmoke = `
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import pkg from 'turkey-map-react';

const TurkeyMap = pkg.default || pkg;
assert.equal(typeof TurkeyMap, 'function');

const html = renderToStaticMarkup(React.createElement(TurkeyMap));
assert.match(html, /id="svg-turkiye-haritasi"/);
assert.equal((html.match(/data-iladi=/g) || []).length, 81);

console.log('ESM package smoke passed.');
`;

const tempRoot = createTempDir('turkey-map-react-package-');

try {
  const { tarball, files } = packPackage(tempRoot);
  console.log(`Packed ${path.basename(tarball)} (${files.length} files).`);

  for (const file of requiredFiles) {
    assert.ok(files.includes(file), `Package is missing required file: ${file}`);
  }

  for (const prefix of forbiddenPrefixes) {
    assert.ok(
      !files.some((file) => file.startsWith(prefix)),
      `Package contains files under forbidden path: ${prefix}`,
    );
  }

  for (const file of forbiddenFiles) {
    assert.ok(
      !files.includes(file),
      `Package contains a file that should not be published: ${file}`,
    );
  }

  const consumerDir = path.join(tempRoot, 'consumer');
  createConsumer(consumerDir, [tarball, 'react@19', 'react-dom@19']);

  writeFile(consumerDir, 'smoke.cjs', cjsSmoke);
  runNode(consumerDir, 'smoke.cjs');

  writeFile(consumerDir, 'smoke.mjs', esmSmoke);
  runNode(consumerDir, 'smoke.mjs');

  console.log('Package smoke tests passed.');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
