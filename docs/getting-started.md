# Getting started

Installation, requirements, entry points, and your first interactive map.

[Back to README](../readme.md) · [Selection and forms](./selection.md) · [API reference](./api.md)

## Installation

```bash
npm install turkey-map-react
```

or with Yarn:

```bash
yarn add turkey-map-react
```

### Requirements and compatibility

This package declares React as a peer dependency and does not bundle React into the published build. The host application must provide React and React DOM (version >=16.8). The package is built to be compatible with React 16/17/18/19 — your application's React installation is used at runtime, avoiding duplicate React instances and version conflicts.

## Quick start

```jsx
import TurkeyMap from 'turkey-map-react';

export default function App() {
  return <TurkeyMap />;
}
```

The root entry includes the built-in 81-province dataset, so no additional props are required.

## Entry points and bundle size

The package publishes four entry points so applications can choose what they bundle:

| Entry point             | What it provides                                                       | When to use it                                                       |
| :---------------------- | :--------------------------------------------------------------------- | :------------------------------------------------------------------- |
| `turkey-map-react`      | The default `TurkeyMap` component plus the built-in 81-province dataset. | You want the one-line `<TurkeyMap />` map.                           |
| `turkey-map-react/core` | The same component without the built-in dataset. `data` is required.   | You supply your own `data` and want the dataset out of your bundle.  |
| `turkey-map-react/data` | The built-in dataset as a named `cities` export.                       | You want to read, filter, or extend the built-in provinces yourself. |
| `turkey-map-react/geojson` | `geoJsonToCities`, which converts GeoJSON polygons into `CityType[]`. | You have GeoJSON and do not want to hand-write SVG paths.            |

Root entry (default, data-backed):

```jsx
import TurkeyMap from 'turkey-map-react';

<TurkeyMap />;
```

Core entry (custom data, no built-in dataset):

```jsx
import TurkeyMap from 'turkey-map-react/core';

const myCities = [
  { id: 'alpha', plateNumber: 1, name: 'Alpha', path: 'M 0 0 L 10 10 Z' },
];

<TurkeyMap data={{ cities: myCities }} />;
```

Data entry (built-in dataset):

```jsx
import { cities } from 'turkey-map-react/data';

const provinceNames = cities.map((city) => city.name);
```

GeoJSON entry (convert boundaries to `data`):

```jsx
import TurkeyMap from 'turkey-map-react/core';
import { geoJsonToCities } from 'turkey-map-react/geojson';

const cities = geoJsonToCities(featureCollection, { idKey: 'ADM1_CODE', nameKey: 'NAME_1' });

<TurkeyMap data={{ cities }} />;
```

Bundle-size implications: the root entry includes the built-in dataset and is roughly 96 kB gzipped. The `core` entry is roughly 11 kB gzipped and contains no province paths, so its final size depends only on the data you pass. The `data` entry carries the dataset alone (roughly 81 kB gzipped) and can be imported without pulling in the component implementation or React. The optional `geojson` helper is roughly 3 kB gzipped and is never included in the root, core, or data entries. Using `turkey-map-react/core` with your own data is the smallest option when you do not need the built-in map.

The root and `core` entries also export the named `useTurkeyMap` hook. The hook renders nothing, requires `data`, and never imports the built-in dataset; use it when you want the interaction engine with your own markup. See [Headless hook](./headless.md) for examples and the full contract.

## Events

On click example:

```jsx
<TurkeyMap
  onClick={({ plateNumber, name }) => {
    console.log(`${plateNumber} - ${name} is just clicked!`);
  }}
/>
```

On mouse over example:

```jsx
<TurkeyMap
  hoverable={true}
  onHover={({ plateNumber, name }) => {
    console.log(`Cursor is over ${plateNumber} - ${name}!`);
  }}
/>
```

In selection modes, `onClick` and `onHover` still fire alongside the selection callbacks. Disabled provinces ignore pointer and keyboard activation, as described in [Disabled provinces](./custom-data.md#disabled-provinces).

## Next steps

- [Selection and forms](./selection.md) — controlled and uncontrolled selection, limits, and form integration.
- [Custom data and cities](./custom-data.md) — custom datasets, disabled provinces, and city wrapping.
- [GeoJSON conversion](./geojson.md) — turn Polygon/MultiPolygon features into `CityType[]` for `data`.
- [API reference](./api.md) — every prop and exported TypeScript type.
