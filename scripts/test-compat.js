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

const reactVersion = process.env.REACT_VERSION || process.argv[2] || '16.8.6';

const smoke = `
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
  React.createElement(TurkeyMap, { showTooltip: true, tooltipText: 'Compatibility tooltip' }),
);
assert.match(tooltip, /Compatibility tooltip/);

const styled = renderToStaticMarkup(
  React.createElement(TurkeyMap, {
    customStyle: { idleColor: '#654321', hoverColor: '#abcdef' },
  }),
);
assert.match(styled, /#654321/);

console.log('React compatibility smoke passed.');
`;

const tempRoot = createTempDir(`turkey-map-react-compat-${reactVersion}-`);

try {
  let tarball = process.env.TARBALL_PATH
    ? path.resolve(process.env.TARBALL_PATH)
    : null;

  if (tarball) {
    assert.ok(fs.existsSync(tarball), `Tarball not found: ${tarball}`);
  } else {
    tarball = packPackage(tempRoot).tarball;
  }

  const consumerDir = path.join(tempRoot, 'consumer');
  createConsumer(consumerDir, [
    tarball,
    `react@${reactVersion}`,
    `react-dom@${reactVersion}`,
  ]);

  writeFile(consumerDir, 'smoke.cjs', smoke);
  runNode(consumerDir, 'smoke.cjs');

  console.log(`React ${reactVersion} compatibility smoke passed.`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
