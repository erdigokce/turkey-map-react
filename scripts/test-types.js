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
  ChoroplethValues,
  CityInteractionState,
  CityStyleGetter,
  CityType,
  ColorScale,
  ColorScaleFunction,
  CustomStyleType,
  Data,
  GetColorCallback,
  IsCityDisabledCallback,
  OnMaxSelectionReachedCallback,
  OnSelectCallback,
  OnSelectionChangeCallback,
  OnViewportChangeCallback,
  RenderTooltipCallback,
  ScaleType,
  SelectionMode,
  SelectionValue,
  TooltipPosition,
  TurkeyMapRef,
  UseTurkeyMapCityProps,
  UseTurkeyMapContainerProps,
  UseTurkeyMapHandlers,
  UseTurkeyMapOptions,
  UseTurkeyMapPoint,
  UseTurkeyMapResult,
  UseTurkeyMapTooltipProps,
  ViewBoxType,
  Viewport,
  useTurkeyMap,
} from 'turkey-map-react';
import CoreTurkeyMap, {
  CityType as CoreCityType,
  TurkeyMapRef as CoreTurkeyMapRef,
  useTurkeyMap as coreUseTurkeyMap,
} from 'turkey-map-react/core';
import { cities } from 'turkey-map-react/data';

const city: CityType = {
  id: 'alpha',
  plateNumber: 1,
  name: 'Alpha',
  path: 'M 0 0 L 10 10 Z',
};

const coreCity: CoreCityType = city;
const datasetCity: CityType = cities[0];
const datasetCoreCity: CoreCityType = cities[0];

const disabledCity: CityType = {
  ...city,
  disabled: true,
};

const disabledCities: string[] = [city.id];

const isCityDisabled: IsCityDisabledCallback = (candidate) => candidate.disabled === true;

const customStyle: CustomStyleType = {
  idleColor: '#444',
  hoverColor: '#dc3522',
  selectedColor: '#1a73e8',
  selectedStroke: '#0b3d91',
  selectedStrokeWidth: 2,
  disabledColor: '#e5e5e5',
  strokeColor: '#ffffff',
  strokeWidth: 1,
  focusStroke: '#ff0000',
  focusStrokeWidth: 3,
};

const getCityStyle: CityStyleGetter = (
  candidate: CityType,
  state: CityInteractionState,
) => {
  if (state.disabled) {
    return { fill: undefined, cursor: 'not-allowed' };
  }

  return {
    fill: state.selected ? '#1a73e8' : undefined,
    opacity: state.hovered || state.focused ? 1 : 0.9,
  };
};

const containerProps: React.HTMLAttributes<HTMLDivElement> = {
  'aria-label': 'Map shell',
  dir: 'ltr',
};

const svgProps: React.SVGAttributes<SVGSVGElement> = {
  'aria-label': 'Turkey provinces',
  role: 'img',
};

const themedStyle = {
  maxWidth: 800,
  '--tm-idle-color': '#eeeeee',
} as React.CSSProperties;

const viewBox: ViewBoxType = {
  top: 0,
  left: 0,
  width: 100,
  height: 100,
};

const data: { cities: CityType[] } = { cities: [city, disabledCity] };

const selectionMode: SelectionMode = 'multiple';
const singleValue: SelectionValue = city.id;
const multipleValue: SelectionValue = [city.id];

const tooltipPosition: TooltipPosition = 'city';
const renderTooltip: RenderTooltipCallback = (tooltipCity) => tooltipCity.name;
const renderTooltipWithValue: RenderTooltipCallback = (tooltipCity, value) => (
  String(value ?? tooltipCity.name)
);

const choroplethValues: ChoroplethValues = { alpha: 10, beta: 90 };
const colorScale: ColorScale = ['#f7fbff', '#08306b'];
const colorScaleFunction: ColorScaleFunction = (value) => (
  value > 50 ? '#08306b' : '#f7fbff'
);
const scaleTypes: ScaleType[] = ['linear', 'quantize', 'quantile', 'threshold'];
const getColor: GetColorCallback = (value, colorCity) => (
  value > 50 ? '#08306b' : colorCity.id === 'alpha' ? '#f7fbff' : '#6baed6'
);

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

const viewport: Viewport = { scale: 2, translateX: -100, translateY: -50 };
const onViewportChange: OnViewportChangeCallback = (nextViewport) => (
  console.log(nextViewport.scale, nextViewport.translateX, nextViewport.translateY)
);
const mapRef = React.createRef<TurkeyMapRef>();
const coreMapRef = React.createRef<CoreTurkeyMapRef>();

const App = () => (
  <TurkeyMap
    ref={mapRef}
    data={data}
    viewBox={viewBox}
    customStyle={customStyle}
    id="checkout-map"
    className="themed-map"
    style={themedStyle}
    containerProps={containerProps}
    svgProps={svgProps}
    getCityStyle={getCityStyle}
    values={choroplethValues}
    colorScale={colorScale}
    scaleType={scaleTypes[0]}
    thresholds={[10, 25, 50]}
    noDataColor="#eeeeee"
    getColor={getColor}
    animateValues={true}
    zoomable={true}
    minZoom={1}
    maxZoom={8}
    zoomControls={true}
    viewport={viewport}
    onViewportChange={onViewportChange}
    visible={true}
    hoverable={true}
    showTooltip={true}
    tooltipText="Tooltip"
    renderTooltip={renderTooltipWithValue}
    tooltipPosition={tooltipPosition}
    tooltipPortal={true}
    tooltipOffset={8}
    tooltipDelay={120}
    disabledCities={disabledCities}
    isCityDisabled={isCityDisabled}
    disabledTooltipText="Not available"
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
    ariaLabel="Türkiye haritası"
    a11yFallback={true}
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

const SingleArgumentTooltip = () => (
  <TurkeyMap
    data={data}
    showTooltip={true}
    renderTooltip={renderTooltip}
    tooltipPosition="cursor"
    tooltipPortal={false}
    tooltipOffset={16}
    tooltipDelay={80}
  />
);

const CoreApp = () => (
  <CoreTurkeyMap
    ref={coreMapRef}
    data={data}
    zoomable={true}
    minZoom={1}
    maxZoom={8}
    zoomControls={true}
    viewport={viewport}
    onViewportChange={onViewportChange}
    selectionMode="multiple"
    selectedCities={selectedCityValues}
    showTooltip={true}
    disabledCities={disabledCities}
    values={choroplethValues}
    colorScale={colorScale}
    onSelectionChange={onSelectionChange}
  />
);

const FunctionScale = () => (
  <TurkeyMap
    data={data}
    values={choroplethValues}
    colorScale={colorScaleFunction}
    scaleType="quantile"
    animateValues={true}
  />
);

const ThresholdScale = () => (
  <TurkeyMap
    data={data}
    values={choroplethValues}
    colorScale={['#eff3ff', '#bdd7e7', '#6baed6', '#08306b']}
    scaleType="threshold"
    thresholds={[10, 25, 50]}
    getColor={getColor}
  />
);

const RefApi = () => {
  const rootRef = React.useRef<TurkeyMapRef>(null);
  const coreRef = React.useRef<CoreTurkeyMapRef>(null);

  return (
    <>
      <TurkeyMap ref={rootRef} data={data} zoomable={true} />
      <CoreTurkeyMap ref={coreRef} data={data} zoomable={true} />
      <button
        type="button"
        onClick={() => {
          rootRef.current?.focusCity('alpha');
          rootRef.current?.focusCity('alpha', 4);
          rootRef.current?.zoomTo(2);
          rootRef.current?.resetView();
          coreRef.current?.focusCity('alpha');
          coreRef.current?.zoomTo(2);
          coreRef.current?.resetView();
        }}
      >
        Zoom
      </button>
    </>
  );
};

type RegionCity = CityType & { region: string };

const regionCity: RegionCity = {
  ...city,
  region: 'Marmara',
};
const regionData: Data<RegionCity> = { cities: [regionCity] };
const defaultHookOptions: UseTurkeyMapOptions = { data: { cities: [city] } };

const HeadlessApp = () => {
  const result: UseTurkeyMapResult<RegionCity> = useTurkeyMap<RegionCity>({
    data: regionData,
    selectionMode: 'multiple',
    selectedCities: [regionCity.id],
    defaultSelectedCities: [regionCity.id],
    maxSelection: 2,
    onSelect: (selectedCity) => console.log(selectedCity.region),
    onSelectionChange: (selectedCities) => (
      console.log(selectedCities.map((selectedCity) => selectedCity.region))
    ),
    onMaxSelectionReached: (attemptedCity, selectedCities, maxSelection) => (
      console.log(attemptedCity.region, selectedCities.length, maxSelection)
    ),
    onHover: (hoveredCity) => console.log(hoveredCity.region),
    onClick: (clickedCity) => console.log(clickedCity.region),
    isCityDisabled: (candidate) => candidate.region === 'blocked',
    disabledCities: [],
    showTooltip: true,
    tooltipPosition: 'city',
    tooltipPortal: true,
    tooltipOffset: 8,
    tooltipDelay: 20,
    visible: true,
    hoverable: true,
    ariaLabel: 'Headless map',
  });

  const containerProps: UseTurkeyMapContainerProps = result.getContainerProps();
  const cityProps: UseTurkeyMapCityProps = result.getCityProps(regionCity);
  const tooltipProps: UseTurkeyMapTooltipProps = result.getTooltipProps();
  const handlers: UseTurkeyMapHandlers<RegionCity> = result.cityHandlers;
  const point: UseTurkeyMapPoint = { pageX: 1, pageY: 2, clientX: 3, clientY: 4 };
  const element = document.body;
  handlers.onEnter(regionCity, element, point);
  handlers.onLeave(regionCity);
  handlers.onMove(regionCity, element, point);
  handlers.onHover(regionCity, {} as React.MouseEvent<Element>);
  handlers.onClick(regionCity, {} as React.MouseEvent<Element>);
  handlers.onActivate(regionCity);
  handlers.onKeyDown(regionCity, {} as React.KeyboardEvent<Element>);
  handlers.onFocus(regionCity, element);
  handlers.onBlur(regionCity);
  result.activateCity(regionCity);
  result.changeSelection([regionCity.id]);
  result.clearSelection();

  return (
    <div {...containerProps}>
      <div {...cityProps}>{result.selectedCities[0]?.region}</div>
      <div {...tooltipProps}>{result.announcement}</div>
      <span>{result.isCityDisabled(regionCity) ? 'disabled' : 'enabled'}</span>
      <span>{result.tooltipCity?.region ?? result.rovingCityId ?? ''}</span>
      <span>{result.focusedCityId ?? ''}</span>
      <span>{String(result.tooltipVisible)}</span>
      <span>{result.cityHandlers === handlers ? 'same' : 'other'}</span>
      <span>{result.registerCityHoverClear(regionCity.id, () => {}) ? 'clear' : 'no clear'}</span>
    </div>
  );
};

const DefaultHookApp = () => {
  const result = useTurkeyMap(defaultHookOptions);
  return <span>{result.selectedCities[0]?.id}</span>;
};

const CoreHookApp = () => {
  const result = coreUseTurkeyMap({ data: regionData });
  return <span>{result.selectedIds.join(',')}</span>;
};

// @ts-expect-error the hook requires a data prop
const MissingDataHook = () => useTurkeyMap({});

// @ts-expect-error the core entry requires a data prop
const CoreWithoutData = () => <CoreTurkeyMap />;

console.log(coreCity.id, datasetCity.id, datasetCoreCity.id, coreCity.id);

export {
  ControlledMultiple,
  ControlledSingle,
  CoreApp,
  CoreHookApp,
  CoreWithoutData,
  DefaultHookApp,
  FunctionScale,
  HeadlessApp,
  MissingDataHook,
  RefApi,
  SingleArgumentTooltip,
  ThresholdScale,
  UncontrolledMultiple,
  UncontrolledSingle,
};
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
