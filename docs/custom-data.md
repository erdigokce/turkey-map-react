# Custom data and cities

Provide your own SVG paths and metadata, disable individual provinces, and wrap the rendered city elements.

[Back to README](../readme.md) · [Getting started](./getting-started.md) · [API reference](./api.md)

## Custom data

```jsx
<TurkeyMap data={{ cities: this.state.apiData }} />
```

If custom SVG paths and/or city metadata need to be rendered, they can be provided through the `data` prop. For full control over the rendered elements, [`useTurkeyMap`](./headless.md#custom-city-metadata) accepts a generic city subtype so metadata survives selection state, getters, and callbacks.

The `data` prop has the following type:

```ts
{ cities: CityType[] }
```

where each city is:

```ts
{
  id: string;
  plateNumber: number;
  name: string;
  path: string;
  disabled?: boolean;
  region?: Region;
  centroid?: { x: number; y: number };
  neighbors?: string[];
  areaKm2?: number;
  population?: number;
  isoCode?: string;
  nutsCode?: string;
  altNames?: string[];
  meta?: Record<string, unknown>;
}
```

Every new field is optional, so existing custom datasets keep working unchanged.

If your source is GeoJSON rather than pre-baked SVG paths, [`geoJsonToCities`](./geojson.md) converts Polygon and MultiPolygon features into this shape, including holes and custom key mappings.

## Built-in geography data

The built-in 81-province dataset populates the optional geography fields so labels, regions, and markers can use them without re-encoding data. Custom datasets may provide any subset.

| Field | Meaning | Source / method | Reference |
| :--- | :--- | :--- | :--- |
| `region` | Conventional seven-region province assignment | Turkish geographical regions | Current classification |
| `centroid` | Label point in SVG user units, same space as `path` and the default viewBox `0 80 1050 585` | Derived from the built-in path geometry by `scripts/compute-centroids.js` | Generated from the checked-in paths |
| `neighbors` | Ids of land-border provinces, symmetric and referentially checked | HGK provincial boundaries, cross-checked against GADM and published adjacency lists | Current boundaries |
| `areaKm2` | Provincial surface area in square kilometres | T.C. MSB Harita Genel Müdürlüğü provincial areas | Current official figures |
| `population` | Provincial population | TÜİK ADNKS (address-based population registration) | 31 December 2025 |
| `isoCode` | ISO 3166-2:TR code, equal to `TR-` plus the zero-padded plate number | ISO 3166-2:TR | Current standard |
| `nutsCode` | NUTS3 province code | NUTS 2021 (Eurostat/TÜİK) | 2021 classification |
| `altNames` | Curated alternative or historical names, only where meaningful | Curated | - |
| `meta` | Consumer-defined metadata; intentionally absent from the built-in dataset | Consumer | - |

`centroid` is not latitude/longitude. It is an interior point in the same SVG coordinate space as the province `path`, so it can be used directly for SVG text or markers.

### Typed custom metadata

Use the generic API to replace the wide `meta` record with your own shape. The `Omit` pattern keeps the city assignable to `CityType`:

```tsx
import TurkeyMap, { CityType, Data } from "turkey-map-react";

type SalesCity = Omit<CityType, "meta"> & { meta: { sales: number } };

const salesData: Data<SalesCity> = {
  cities: [
    { id: "ankara", plateNumber: 6, name: "Ankara", path: "M 0 0 L 10 10 L 0 10 Z", meta: { sales: 1200 } },
  ],
};

<TurkeyMap<SalesCity> data={salesData} onHover={(city) => city.meta.sales} />;
```

The same generic is available on `CoreTurkeyMap` and `useTurkeyMap`. A custom city type should be paired with matching `data`; the root entry's built-in fallback only guarantees the base `CityType` fields.

The root entry falls back to the built-in dataset when `data` is omitted. The `turkey-map-react/core` entry does not: it requires `data` in TypeScript, and plain JavaScript that omits it renders no provinces.

## Disabled provinces

Provinces can be disabled through three additive sources: a list of ids, a predicate, or a per-city flag in custom data.

```jsx
// 1. Disable by city id
<TurkeyMap disabledCities={['hakkari', 'sirnak']} />

// 2. Disable with a predicate (works with custom data)
const customCities = [
  { id: 'alpha', plateNumber: 1, name: 'Alpha', path: '...' },
];

<TurkeyMap
  data={{ cities: customCities }}
  isCityDisabled={(city) => city.name === 'Alpha'}
/>

// 3. Disable from the dataset
const citiesWithDisabled = [
  { id: 'alpha', plateNumber: 1, name: 'Alpha', path: '...', disabled: true },
];

<TurkeyMap data={{ cities: citiesWithDisabled }} />
```

A city is disabled when any source marks it disabled. Unknown ids in `disabledCities` are ignored, and offering the same id more than once has no additional effect.

Disabled provinces stay rendered and discoverable, but ignore pointer and keyboard activation: `onHover`, `onClick`, `onSelect`, `onSelectionChange`, and `onMaxSelectionReached` do not fire. They use `disabledColor` (default `#e5e5e5`), `cursor: not-allowed`, and `aria-disabled="true"`. Disabled styling wins over hover and selected styling.

```jsx
<TurkeyMap
  selectionMode="multiple"
  selectedCities={['ankara']}
  disabledCities={['hakkari', 'sirnak']}
  showTooltip={true}
  disabledTooltipText="Not available"
  customStyle={{
    idleColor: '#444',
    hoverColor: '#dc3522',
    disabledColor: '#e5e5e5',
  }}
/>
```

In selection modes and in `"none"` mode, disabled provinces remain keyboard focusable so assistive technology can announce them; Enter/Space performs no activation.

Selection values are never filtered. If a selected city becomes disabled it stays in `selectedCity` / `selectedCities` and in `onSelectionChange` payloads, but it cannot be deselected from the map until it is re-enabled or the controlled value is updated.

## City wrapping

```jsx
const renderCity = (cityComponent, cityData) => (
  <Tooltip title={cityData.name} key={cityData.id}>
    {cityComponent}
  </Tooltip>
);

<TurkeyMap cityWrapper={renderCity} />;
```

This is generally used for [Antd](https://ant.design/components/tooltip/) style *Tooltip*. The `cityComponent` argument is the rendered province DOM.

## Related

- [GeoJSON conversion](./geojson.md) — turn Polygon/MultiPolygon features into `CityType[]` for `data`.
- [Styling and DOM ids](./styling.md) — colors for idle, hovered, selected, and disabled provinces.
- [Accessibility](./accessibility.md) — how disabled provinces participate in keyboard navigation.
- [API reference: data and interaction props](./api.md#data-and-interaction) — `data`, `disabledCities`, `isCityDisabled`, and `cityWrapper`.
