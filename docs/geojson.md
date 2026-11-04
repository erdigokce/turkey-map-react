# GeoJSON conversion

Turn GeoJSON province, district, or custom boundaries into the `CityType[]` structure the map already renders.

[Back to README](../readme.md) · [Getting started](./getting-started.md) · [Custom data](./custom-data.md) · [API reference](./api.md)

## Quick start

```jsx
import TurkeyMap from 'turkey-map-react';
import { geoJsonToCities } from 'turkey-map-react/geojson';

const cities = geoJsonToCities(provinceGeoJson, {
  idKey: 'ADM1_CODE',
  nameKey: 'NAME_1',
  plateKey: 'PLATE',
});

export default function App() {
  return <TurkeyMap data={{ cities }} />;
}
```

The helper is a pure function. It does not fetch, parse, or validate files; pass it an already-parsed GeoJSON object. It returns a new array suitable for the `data` prop of both `turkey-map-react` and `turkey-map-react/core`.

## Accepted input

`geoJsonToCities` accepts:

- a GeoJSON `FeatureCollection`, or
- a single GeoJSON `Feature`

whose geometry is a `Polygon` or `MultiPolygon`. Coordinates are treated as `[longitude, latitude]`; any additional ordinates are ignored.

Features with other geometry types, `geometry: null`, unusable rings, or missing ids are skipped with a development warning instead of aborting the conversion. A malformed top-level value (`null`, an array, an unknown `type`, or a `FeatureCollection` without `features`) throws a `TypeError`.

## Options

| Option      | Type                                                              | Default                                              | Description |
| :---------- | :---------------------------------------------------------------- | :--------------------------------------------------- | :---------- |
| `idKey`     | `string \| (properties, feature, index) => string \| number`      | `"id"`                                              | Source of the city id. |
| `nameKey`   | `string \| (properties, feature, index) => string \| number`      | `"name"`                                            | Source of the city name. Falls back to the id. |
| `plateKey`  | `string \| (properties, feature, index) => string \| number`      | `"plateNumber"`                                     | Source of the plate number. Missing or non-numeric values become `0`. |
| `project`   | `(lon, lat) => [x, y]`                                            | `(lon, lat) => [lon, -lat]`                         | Replaces the longitude/latitude-to-planar mapping. The result is still fitted into the viewBox. |
| `viewBox`   | `{ top, left, width, height }`                                    | `{ top: 0, left: 80, width: 1050, height: 585 }`    | Target SVG coordinate space. |
| `padding`   | `number`                                                          | `0`                                                  | Inset from each viewBox edge, in SVG units. |
| `precision` | `number`                                                          | `4`                                                  | Decimal places used for generated coordinates. |

### Key mapping

Property names are the common case:

```js
const cities = geoJsonToCities(collection, {
  idKey: 'ADM1_CODE',
  nameKey: 'NAME_1',
  plateKey: 'PLATE',
});
```

Use an accessor when a value must be derived or sanitized:

```js
const cities = geoJsonToCities(collection, {
  idKey: (properties, feature, index) => (
    typeof properties.code === 'string'
      ? properties.code.toLowerCase().replace(/\s+/g, '-')
      : `city-${index}`
  ),
  nameKey: (properties) => String(properties.label ?? properties.name ?? ''),
  plateKey: (properties) => Number(properties.plate) || 0,
});
```

The accessor receives the feature `properties` (or an empty object when properties are missing), the feature itself, and its zero-based index. The returned id is trimmed and used verbatim, so it must be unique and safe to use as a DOM id. Duplicate ids are preserved in the output and reported with a development warning.

### Custom projection

`project` changes only how longitude/latitude becomes planar `[x, y]`. The helper still computes one bounding box for the whole collection and fits it into the viewBox with a single uniform scale:

```js
const cities = geoJsonToCities(collection, {
  project: (lon, lat) => {
    const x = lon * Math.PI / 180;
    const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
    return [x, y];
  },
});
```

Return a finite coordinate pair. A non-finite or malformed result skips the owning feature with a development warning.

## Output

Each returned item is a `CityType`:

```ts
{
  id: string;
  name: string;
  plateNumber: number;
  path: string;
}
```

`path` uses absolute `M`, `L`, and `Z` commands and starts with `M `. Each ring is a separate subpath, so holes survive. Exterior rings and holes are emitted with opposite winding, which means the component's default SVG fill rule renders holes correctly without a `fillRule` prop.

## Coordinates and fitting

All features in one call share a single uniform scale and translation. The collection is centered inside `viewBox`, inset by `padding`, so relative positions and aspect ratio are preserved. A wide geography can leave unused space in a viewBox with a different aspect ratio; pass a matching `viewBox` when you need the geography to fill the map.

The default projection is a simple equirectangular mapping (`x = longitude`, `y = -latitude`). It is **not** a true cartographic projection:

- There is no Mercator, Albers, or other distortion correction.
- Latitude is not scaled by `cos(latitude)`, so shapes are stretched at high latitudes.
- There is no dateline or antimeridian handling; split such geometries before conversion.
- There is no geometry simplification or topology repair.

Use `project` when you need a different planar mapping.

## Errors and warnings

| Condition | Behavior |
| :-------- | :------- |
| Invalid top-level input | Throws `TypeError`. |
| Unsupported geometry type | Skips the feature and warns in development. |
| `geometry: null` or missing coordinates | Skips the feature and warns in development. |
| Missing, empty, or unusable id | Skips the feature and warns in development. |
| Ring with fewer than three distinct positions, a non-finite coordinate, or zero area | Skips the feature and warns in development. |
| Invalid `viewBox`, `padding`, or `precision` | Uses the documented default and warns in development. |
| Duplicate ids | Keeps both entries and warns in development. |

Warnings use `console.warn` and are omitted when `process.env.NODE_ENV === "production"`.

## Bundle size

`turkey-map-react/geojson` is a separate entry point. Importing it does not add React, the component, or the built-in dataset to your bundle, and the root, core, and data entries do not include the helper. The published helper is roughly 3 kB gzipped; the release check enforces a 5 KiB budget for the entry.

## TypeScript

The public types are exported from the same subpath:

```ts
import {
  geoJsonToCities,
  GeoJsonFeatureCollection,
  GeoJsonFeature,
  GeoJsonToCitiesOptions,
  GeoJsonKeyAccessor,
  GeoJsonProject,
  GeoJsonViewBox,
} from 'turkey-map-react/geojson';
```

The declarations are self-contained and do not require React types, so the helper can be used in a Node script that does not install React.

## Related

- [Custom data and cities](./custom-data.md) — the full `CityType` shape and optional geography fields.
- [Styling and DOM ids](./styling.md) — how ids become DOM ids and instance-scoped selectors.
- [API reference](./api.md) — component props and exported types.
