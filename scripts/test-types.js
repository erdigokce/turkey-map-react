#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  createConsumer,
  createTempDir,
  packPackage,
  root,
  writeFile,
} = require('./test-utils');

const consumerSource = `
import React from 'react';
import TurkeyMap, {
  CityType,
  CustomStyleType,
  OnMaxSelectionReachedCallback,
  OnSelectCallback,
  OnSelectionChangeCallback,
  SelectionMode,
  SelectionValue,
  ViewBoxType,
} from 'turkey-map-react';

const city: CityType = {
  id: 'alpha',
  plateNumber: 1,
  name: 'Alpha',
  path: 'M 0 0 L 10 10 Z',
};

const customStyle: CustomStyleType = {
  idleColor: '#444',
  hoverColor: '#dc3522',
  selectedColor: '#1a73e8',
  selectedStroke: '#0b3d91',
  selectedStrokeWidth: 2,
};

const viewBox: ViewBoxType = {
  top: 0,
  left: 0,
  width: 100,
  height: 100,
};

const data: { cities: CityType[] } = { cities: [city] };

const selectionMode: SelectionMode = 'multiple';
const singleValue: SelectionValue = city.id;
const multipleValue: SelectionValue = [city.id];

const selectedCityValue: string | null = city.id;
const selectedCityValues: string[] = [city.id];

const onSelect: OnSelectCallback = (selectedCity) => console.log(selectedCity.plateNumber);
const onSelectionChange: OnSelectionChangeCallback = (selectedCities) => (
  console.log(selectedCities.map((selectedCity) => selectedCity.id))
);
const onMaxSelectionReached: OnMaxSelectionReachedCallback = (
  attemptedCity,
  selectedCities,
  maxSelection,
) => console.log(attemptedCity.name, selectedCities.length, maxSelection);

const cityWrapper = (element: React.ReactElement, wrappedCity: CityType) => (
  <g data-city={wrappedCity.id}>{element}</g>
);

const App = () => (
  <TurkeyMap
    data={data}
    viewBox={viewBox}
    customStyle={customStyle}
    visible={true}
    hoverable={true}
    showTooltip={true}
    tooltipText="Tooltip"
    cityWrapper={cityWrapper}
    onHover={(hoveredCity) => console.log(hoveredCity.plateNumber)}
    onClick={(clickedCity) => console.log(clickedCity.name)}
    selectionMode={selectionMode}
    selectedCity={selectedCityValue}
    defaultSelectedCity={city.id}
    selectedCities={selectedCityValues}
    defaultSelectedCities={[city.id]}
    maxSelection={3}
    onSelect={onSelect}
    onSelectionChange={onSelectionChange}
    onMaxSelectionReached={onMaxSelectionReached}
  />
);

const ControlledSingle = () => (
  <TurkeyMap
    data={data}
    selectionMode="single"
    selectedCity={typeof singleValue === 'string' ? singleValue : null}
    onSelect={onSelect}
    onSelectionChange={onSelectionChange}
  />
);

const UncontrolledSingle = () => (
  <TurkeyMap
    data={data}
    selectionMode="single"
    defaultSelectedCity={city.id}
    onSelect={onSelect}
  />
);

const ControlledMultiple = () => (
  <TurkeyMap
    data={data}
    selectionMode="multiple"
    selectedCities={Array.isArray(multipleValue) ? multipleValue : []}
    maxSelection={3}
    onSelectionChange={onSelectionChange}
    onMaxSelectionReached={onMaxSelectionReached}
  />
);

const UncontrolledMultiple = () => (
  <TurkeyMap
    data={data}
    selectionMode="multiple"
    defaultSelectedCities={selectedCityValues}
    onSelectionChange={onSelectionChange}
  />
);

export { ControlledMultiple, ControlledSingle, UncontrolledMultiple, UncontrolledSingle };
export default App;
`;

const tsconfig = {
  compilerOptions: {
    target: 'ES2020',
    module: 'ESNext',
    moduleResolution: 'bundler',
    jsx: 'react-jsx',
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    skipLibCheck: true,
    types: ['react', 'react-dom'],
  },
  include: ['index.tsx'],
};

const tempRoot = createTempDir('turkey-map-react-types-');

try {
  const { tarball } = packPackage(tempRoot);
  const consumerDir = path.join(tempRoot, 'consumer');

  createConsumer(consumerDir, [
    tarball,
    'react@19',
    'react-dom@19',
    '@types/react@19',
    '@types/react-dom@19',
  ]);

  writeFile(consumerDir, 'index.tsx', consumerSource);
  writeFile(consumerDir, 'tsconfig.json', JSON.stringify(tsconfig, null, 2));

  execFileSync(
    path.join(root, 'node_modules', '.bin', 'tsc'),
    ['--project', path.join(consumerDir, 'tsconfig.json')],
    { cwd: consumerDir, stdio: 'inherit' },
  );

  console.log('TypeScript consumer smoke passed.');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
