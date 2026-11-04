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
  Centroid,
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
  Region,
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
  Centroid as CoreCentroid,
  CityType as CoreCityType,
  Region as CoreRegion,
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

const region: Region = 'ege';
const centroid: Centroid = { x: 1, y: 2 };
const coreRegion: CoreRegion = region;
const coreCentroid: CoreCentroid = centroid;
const datasetRegion: Region | undefined = cities[0].region;
const datasetCentroid: Centroid | undefined = cities[0].centroid;
const datasetNeighbors: string[] | undefined = cities[0].neighbors;
const datasetArea: number | undefined = cities[0].areaKm2;
const datasetPopulation: number | undefined = cities[0].population;
const datasetIso: string | undefined = cities[0].isoCode;
const datasetNuts: string | undefined = cities[0].nutsCode;
const datasetAltNames: string[] | undefined = cities[0].altNames;
const datasetMeta: Record<string, unknown> | undefined = cities[0].meta;

// @ts-expect-error unknown region value
const invalidRegion: CityType = { ...city, region: 'aegean' };

type SalesCity = Omit<CityType, 'meta'> & { meta: { sales: number } };
const salesCity: SalesCity = { ...city, meta: { sales: 42 } };
const salesData: Data<SalesCity> = { cities: [salesCity] };

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

const RichApp = () => (
  <TurkeyMap<SalesCity>
    data={salesData}
    selectionMode="multiple"
    onHover={(hovered) => hovered.meta.sales.toFixed(0)}
    onClick={(clicked) => clicked.meta.sales.toFixed(0)}
    onSelect={(selected) => selected.meta.sales.toFixed(0)}
    onSelectionChange={(selected) => selected.map((item) => item.meta.sales.toFixed(0)).join(',')}
    onMaxSelectionReached={(attempted) => attempted.meta.sales.toFixed(0)}
    getCityStyle={(styled) => ({ opacity: styled.meta.sales > 0 ? 1 : 0.5 })}
    isCityDisabled={(candidate) => candidate.meta.sales < 0}
    renderTooltip={(tooltipCity) => tooltipCity.meta.sales.toFixed(0)}
    cityWrapper={(element, wrapped) => <g data-sales={wrapped.meta.sales}>{element}</g>}
  />
);

const RichCoreApp = () => (
  <CoreTurkeyMap<SalesCity>
    data={salesData}
    onHover={(hovered) => hovered.meta.sales.toFixed(0)}
  />
);

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

type ZoneCity = CityType & { zone: string };

const zoneCity: ZoneCity = {
  ...city,
  zone: 'Marmara',
};
const zoneData: Data<ZoneCity> = { cities: [zoneCity] };
const defaultHookOptions: UseTurkeyMapOptions = { data: { cities: [city] } };

const HeadlessApp = () => {
  const result: UseTurkeyMapResult<ZoneCity> = useTurkeyMap<ZoneCity>({
    data: zoneData,
    selectionMode: 'multiple',
    selectedCities: [zoneCity.id],
    defaultSelectedCities: [zoneCity.id],
    maxSelection: 2,
    onSelect: (selectedCity) => console.log(selectedCity.zone),
    onSelectionChange: (selectedCities) => (
      console.log(selectedCities.map((selectedCity) => selectedCity.zone))
    ),
    onMaxSelectionReached: (attemptedCity, selectedCities, maxSelection) => (
      console.log(attemptedCity.zone, selectedCities.length, maxSelection)
    ),
    onHover: (hoveredCity) => console.log(hoveredCity.zone),
    onClick: (clickedCity) => console.log(clickedCity.zone),
    isCityDisabled: (candidate) => candidate.zone === 'blocked',
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
  const cityProps: UseTurkeyMapCityProps = result.getCityProps(zoneCity);
  const tooltipProps: UseTurkeyMapTooltipProps = result.getTooltipProps();
  const handlers: UseTurkeyMapHandlers<ZoneCity> = result.cityHandlers;
  const point: UseTurkeyMapPoint = { pageX: 1, pageY: 2, clientX: 3, clientY: 4 };
  const element = document.body;
  handlers.onEnter(zoneCity, element, point);
  handlers.onLeave(zoneCity);
  handlers.onMove(zoneCity, element, point);
  handlers.onHover(zoneCity, {} as React.MouseEvent<Element>);
  handlers.onClick(zoneCity, {} as React.MouseEvent<Element>);
  handlers.onActivate(zoneCity);
  handlers.onKeyDown(zoneCity, {} as React.KeyboardEvent<Element>);
  handlers.onFocus(zoneCity, element);
  handlers.onBlur(zoneCity);
  result.activateCity(zoneCity);
  result.changeSelection([zoneCity.id]);
  result.clearSelection();

  return (
    <div {...containerProps}>
      <div {...cityProps}>{result.selectedCities[0]?.zone}</div>
      <div {...tooltipProps}>{result.announcement}</div>
      <span>{result.isCityDisabled(zoneCity) ? 'disabled' : 'enabled'}</span>
      <span>{result.tooltipCity?.zone ?? result.rovingCityId ?? ''}</span>
      <span>{result.focusedCityId ?? ''}</span>
      <span>{String(result.tooltipVisible)}</span>
      <span>{result.cityHandlers === handlers ? 'same' : 'other'}</span>
      <span>{result.registerCityHoverClear(zoneCity.id, () => {}) ? 'clear' : 'no clear'}</span>
    </div>
  );
};

const DefaultHookApp = () => {
  const result = useTurkeyMap(defaultHookOptions);
  return <span>{result.selectedCities[0]?.id}</span>;
};

const CoreHookApp = () => {
  const result = coreUseTurkeyMap({ data: zoneData });
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
  RichApp,
  RichCoreApp,
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
