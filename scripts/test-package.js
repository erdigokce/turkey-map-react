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
  'lib/core.js',
  'lib/core.d.ts',
  'lib/useTurkeyMap.js',
  'lib/useTurkeyMap.d.ts',
  'lib/Tooltip.js',
  'lib/Tooltip.d.ts',
  'lib/data/index.js',
  'lib/data/index.d.ts',
  'lib/geojson.js',
  'lib/geojson.d.ts',
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
const corePkg = require('turkey-map-react/core');
const CoreTurkeyMap = corePkg.default || corePkg;
const useTurkeyMap = pkg.useTurkeyMap;
const coreUseTurkeyMap = corePkg.useTurkeyMap;
const { cities } = require('turkey-map-react/data');
const { geoJsonToCities } = require('turkey-map-react/geojson');

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
const rootHeadlessHtml = renderToStaticMarkup(
  React.createElement(Headless, { data: headlessData, hook: useTurkeyMap }),
);
assert.match(rootHeadlessHtml, /role="listbox"/);
assert.match(rootHeadlessHtml, /data-tm-city-id="alpha"/);
const coreHeadlessHtml = renderToStaticMarkup(
  React.createElement(Headless, { data: headlessData, hook: coreUseTurkeyMap }),
);
assert.match(coreHeadlessHtml, /aria-label="Alpha, plate 1"/);

const html = renderToStaticMarkup(React.createElement(TurkeyMap));
assert.match(html, /id="svg-turkiye-haritasi"/);
assert.equal((html.match(/data-iladi=/g) || []).length, 81);

const customCities = [
  { id: 'alpha', plateNumber: 1, name: 'Alpha', path: 'M 0 0 L 10 10 Z' },
  { id: 'beta', plateNumber: 2, name: 'Beta', path: 'M 20 20 L 30 30 Z' },
];
const coreHtml = renderToStaticMarkup(
  React.createElement(CoreTurkeyMap, { data: { cities: customCities } }),
);
assert.match(coreHtml, /data-iladi="Alpha"/);
assert.equal((coreHtml.match(/data-iladi=/g) || []).length, 2);

const emptyCoreHtml = renderToStaticMarkup(React.createElement(CoreTurkeyMap));
assert.equal((emptyCoreHtml.match(/data-iladi=/g) || []).length, 0);

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

const geoCities = geoJsonToCities({
  type: 'Feature',
  properties: { id: 'geo', name: 'Geo', plateNumber: 7 },
  geometry: {
    type: 'Polygon',
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
  },
});
assert.equal(geoCities.length, 1);
assert.equal(geoCities[0].id, 'geo');
assert.equal(geoCities[0].plateNumber, 7);
assert.match(geoCities[0].path, /^M /);

console.log('CJS package smoke passed.');
`;

const esmSmoke = `
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import pkg from 'turkey-map-react';
import corePkg from 'turkey-map-react/core';
import { cities } from 'turkey-map-react/data';
import { geoJsonToCities } from 'turkey-map-react/geojson';

const TurkeyMap = pkg.default || pkg;
const CoreTurkeyMap = corePkg.default || corePkg;
const useTurkeyMap = pkg.useTurkeyMap;
const coreUseTurkeyMap = corePkg.useTurkeyMap;
assert.ok(['function', 'object'].includes(typeof TurkeyMap));
assert.ok(['function', 'object'].includes(typeof CoreTurkeyMap));
assert.equal(typeof useTurkeyMap, 'function');
assert.equal(typeof coreUseTurkeyMap, 'function');
assert.equal(cities.length, 81);

const Headless = ({ data, hook }) => {
  const { getContainerProps, getCityProps, selectedCities } = hook({
    data,
    selectionMode: 'single',
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

const geoCities = geoJsonToCities({
  type: 'Feature',
  properties: { id: 'geo', name: 'Geo', plateNumber: 7 },
  geometry: {
    type: 'Polygon',
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
  },
});
assert.equal(geoCities.length, 1);
assert.equal(geoCities[0].id, 'geo');
assert.match(geoCities[0].path, /^M /);

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
