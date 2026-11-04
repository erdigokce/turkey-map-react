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
const corePkg = require('turkey-map-react/core');
const CoreTurkeyMap = corePkg.default || corePkg;
const useTurkeyMap = pkg.useTurkeyMap;
const coreUseTurkeyMap = corePkg.useTurkeyMap;
const { cities } = require('turkey-map-react/data');

assert.ok(['function', 'object'].includes(typeof TurkeyMap));
assert.ok(['function', 'object'].includes(typeof CoreTurkeyMap));
assert.equal(typeof useTurkeyMap, 'function');
assert.equal(typeof coreUseTurkeyMap, 'function');
assert.equal(cities.length, 81);

const Headless = ({ data, hook }) => {
  const { getContainerProps, getCityProps, selectedCities } = hook({
    data,
    selectionMode: 'multiple',
  });

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      getContainerProps(),
      data.cities.map((city) => React.createElement(
        'div',
        { key: city.id, ...getCityProps(city) },
        city.name,
      )),
    ),
    React.createElement('span', null, selectedCities.map((city) => city.id).join(',')),
  );
};

const headlessData = {
  cities: [{ id: 'alpha', plateNumber: 1, name: 'Alpha', path: 'M 0 0 L 10 10 Z' }],
};
const headlessHtml = renderToStaticMarkup(
  React.createElement(Headless, { data: headlessData, hook: useTurkeyMap }),
);
assert.match(headlessHtml, /role="listbox"/);
assert.match(headlessHtml, /data-tm-city-id="alpha"/);
const coreHeadlessHtml = renderToStaticMarkup(
  React.createElement(Headless, { data: headlessData, hook: coreUseTurkeyMap }),
);
assert.match(coreHeadlessHtml, /aria-label="Alpha, plate 1"/);

const html = renderToStaticMarkup(React.createElement(TurkeyMap));
assert.match(html, /id="svg-turkiye-haritasi"/);
assert.equal((html.match(/data-iladi=/g) || []).length, 81);

const coreHtml = renderToStaticMarkup(
  React.createElement(CoreTurkeyMap, {
    data: { cities: [{ id: 'alpha', plateNumber: 1, name: 'Alpha', path: 'M 0 0 L 10 10 Z' }] },
  }),
);
assert.match(coreHtml, /data-iladi="Alpha"/);
assert.equal((coreHtml.match(/data-iladi=/g) || []).length, 1);

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
