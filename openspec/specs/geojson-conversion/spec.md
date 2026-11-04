# geojson-conversion Specification

## Purpose

Turns GeoJSON polygon geography into the `CityType[]` structures the map already renders, so consumers can use province, district, or non-Turkey boundaries without hand-writing SVG paths.

## Requirements

### Requirement: Dedicated helper entry point and output contract

The package SHALL expose a `turkey-map-react/geojson` subpath with a named `geoJsonToCities` export. The function MUST return a new `CityType[]` in the same order as the input features. Every item MUST contain the existing `CityType` fields `id`, `name`, `plateNumber`, and `path`, and MUST NOT set `disabled`.

The returned array MUST be directly usable as `data={{ cities }}` on both `turkey-map-react` and `turkey-map-react/core`, with no further conversion. The helper MUST NOT be imported by the root, core, or data entries, and importing the helper MUST NOT pull React, the component implementation, or the built-in dataset into the consumer's runtime graph. The subpath MUST publish TypeScript declarations that resolve for CommonJS and bundler module resolution, and those declarations MUST NOT require React types.

#### Scenario: Convert and render

- **WHEN** a consumer calls `geoJsonToCities(featureCollection)` and passes the result as `data={{ cities }}`
- **THEN** the map renders one province per returned city using the generated path

#### Scenario: Helper entry is isolated

- **WHEN** a consumer imports only `turkey-map-react/geojson`
- **THEN** the import resolves to the helper, includes no React or component code, and the root and core bundles do not contain the helper

#### Scenario: Declarations resolve without React

- **WHEN** a TypeScript project without React type definitions imports `geoJsonToCities` from `turkey-map-react/geojson`
- **THEN** the import type-checks and the returned value is assignable to a structurally identical `CityType[]`

### Requirement: Supported input shapes and top-level validation

The helper SHALL accept a GeoJSON `FeatureCollection`, or a single GeoJSON `Feature` whose geometry is a `Polygon` or `MultiPolygon`. The recognized coordinates MUST be GeoJSON longitude/latitude positions, with any additional ordinates ignored.

A top-level value that is not a GeoJSON object, has an unrecognized `type`, is a `FeatureCollection` without a `features` array, or is a `Feature` without a `geometry` key MUST throw a `TypeError` whose message identifies the unsupported input. Feature-level problems MUST be skipped rather than aborting the whole conversion.

#### Scenario: Feature collection is accepted

- **WHEN** the helper receives a valid `FeatureCollection` of Polygon and MultiPolygon features
- **THEN** it returns one city per valid feature in input order

#### Scenario: Single feature is accepted

- **WHEN** the helper receives one valid Polygon `Feature`
- **THEN** it returns a single-element array for that feature

#### Scenario: Invalid top-level input throws

- **WHEN** the helper receives `null`, an array, a string, an object with an unknown `type`, or a `FeatureCollection` without `features`
- **THEN** it throws a `TypeError` and returns no partial output

### Requirement: Key mapping and metadata fallbacks

The helper SHALL accept `idKey`, `nameKey`, and `plateKey` options. Each option MUST be either a property name or an accessor function receiving `(properties, feature, index)`. Property names read from the feature's `properties` object; a missing or `null` `properties` object is treated as empty. Defaults MUST be `"id"`, `"name"`, and `"plateNumber"`.

`id` MUST be converted to a string, trimmed, and used verbatim. A feature whose id is missing, empty, or non-finite MUST be skipped with a development warning, because ids identify provinces in the component. A missing or empty name MUST fall back to the id. A missing, non-numeric, or non-finite plate value MUST become `0`; numeric strings MUST be parsed as numbers. Duplicate ids MUST be preserved in output and reported with a development warning so callers can correct their data.

#### Scenario: Custom keys map metadata

- **WHEN** the helper is called with `idKey: "ADM1_CODE"`, `nameKey: "NAME_1"`, and `plateKey: "PLATE"`
- **THEN** each city's `id`, `name`, and `plateNumber` come from those properties

#### Scenario: Accessor functions derive values

- **WHEN** an accessor function is supplied for a key
- **THEN** it receives the feature properties, the feature, and the feature index, and its returned value is used for that field

#### Scenario: Missing id skips the feature

- **WHEN** a feature has no id, an empty id, or an unusable id value
- **THEN** that feature is omitted, the remaining features are converted, and a development warning explains the skip

#### Scenario: Name and plate fall back

- **WHEN** a feature has a usable id but no name or plate number
- **THEN** its name equals its id, its plate number is `0`, and it is still returned

#### Scenario: Numeric strings become plate numbers

- **WHEN** the plate property is `"34"` or `34`
- **THEN** the resulting `plateNumber` is the number `34`

### Requirement: Polygon and MultiPolygon paths preserve holes

The helper SHALL convert every exterior and interior ring of a `Polygon` into SVG path subpaths, and SHALL combine every polygon of a `MultiPolygon` into one path for that feature. The first ring of each polygon is treated as the exterior; subsequent rings are holes. A hole MUST remain a hole when rendered by the component's existing path element, without requiring a new `fillRule` prop or any component change.

Generated paths MUST use absolute `M`, `L`, and `Z` commands and end each ring with `Z`. A ring's optional duplicated closing position MUST be removed before emission, and consecutive duplicate positions MUST NOT produce duplicate path commands. Positions MUST be finite numbers; a ring that collapses to fewer than three distinct positions, or any non-finite coordinate, MUST cause its feature to be skipped with a development warning.

#### Scenario: Polygon with a hole

- **WHEN** a Polygon feature has an exterior ring and one interior ring
- **THEN** its path contains both rings as separate subpaths and the interior ring renders as a hole

#### Scenario: MultiPolygon becomes one city

- **WHEN** a MultiPolygon feature has several polygons
- **THEN** it produces exactly one city whose path contains every polygon and every hole

#### Scenario: Unclosed or duplicated ring

- **WHEN** a ring repeats its first position at the end or contains consecutive duplicate positions
- **THEN** the duplicate is not emitted and the ring still closes with `Z`

#### Scenario: Degenerate geometry is skipped

- **WHEN** a feature's ring has fewer than three distinct positions or a non-finite coordinate
- **THEN** the feature is omitted with a development warning and other features are still converted

### Requirement: Default projection and viewBox fitting

The helper SHALL project GeoJSON longitude/latitude into the map's SVG coordinate space. The default projection MUST be a simple equirectangular mapping, using longitude as x and negated latitude as y. All projected points in the input MUST share a single uniform scale and translation, fitted and centered inside the target viewBox, so relative geometry and aspect ratio are preserved rather than stretched per axis.

The target defaults to the component's default viewBox `{ top: 0, left: 80, width: 1050, height: 585 }` and MAY be overridden with a structurally compatible `viewBox` option. Padding insets the fitted content from every viewBox edge. The helper MUST fit once for the whole input collection, not once per feature, so separate provinces share a coordinate system.

#### Scenario: Default output fits the component viewBox

- **WHEN** the helper converts a collection without projection or viewBox options
- **THEN** every generated coordinate lies inside the default viewBox and the collection is centered within it

#### Scenario: Custom viewBox is honored

- **WHEN** `viewBox: { top: 0, left: 0, width: 100, height: 100 }` is supplied
- **THEN** every generated coordinate lies inside `0 0 100 100`

#### Scenario: Uniform scaling preserves shape

- **WHEN** a square input geometry is converted
- **THEN** its output remains square rather than being stretched to the viewBox aspect ratio

#### Scenario: Padding insets the result

- **WHEN** a positive `padding` is supplied
- **THEN** the fitted content stays at least that many SVG units from each viewBox edge

#### Scenario: Shared coordinate system

- **WHEN** two features are converted together
- **THEN** their relative positions match their input geography and neither is fitted independently

### Requirement: Custom projection hook

The helper SHALL accept `project?: (lon: number, lat: number) => [number, number]`. When supplied, it MUST replace only the longitude/latitude-to-planar mapping; the returned planar coordinates MUST still be fitted into the target viewBox as described above. The hook MUST be called once per position. A hook result that is not a pair of finite numbers MUST cause the affected feature to be skipped with a development warning rather than producing invalid path data.

#### Scenario: Custom projection is used

- **WHEN** `project` returns a transformed coordinate for each position
- **THEN** generated geometry reflects that transformation and is fitted into the target viewBox

#### Scenario: Custom projection participates in fitting

- **WHEN** a custom projection produces a wide or tall planar result
- **THEN** the whole result is uniformly fitted and centered inside the target viewBox

#### Scenario: Non-finite projection output is rejected

- **WHEN** `project` returns `NaN`, `Infinity`, or a value that is not a coordinate pair
- **THEN** the affected feature is skipped with a development warning and other features are still converted

### Requirement: Option normalization

The helper SHALL normalize its numeric and layout options deterministically:

- `viewBox` MUST be used only when `top`, `left`, `width`, and `height` are finite and `width` and `height` are greater than zero; otherwise the default viewBox applies with a development warning.
- `padding` MUST be a finite number greater than or equal to `0`; otherwise `0` applies with a development warning.
- `precision` MUST be a non-negative integer; otherwise `4` applies with a development warning. Output coordinates MUST be rounded to that many decimal places, with no negative zero.

#### Scenario: Invalid viewBox falls back

- **WHEN** `viewBox` has a zero, negative, or non-finite width or height
- **THEN** the default viewBox is used and a development warning is emitted

#### Scenario: Invalid padding falls back

- **WHEN** `padding` is negative, `NaN`, or `Infinity`
- **THEN** padding is treated as `0` and a development warning is emitted

#### Scenario: Invalid precision falls back

- **WHEN** `precision` is negative, fractional, `NaN`, or `Infinity`
- **THEN** coordinates use `4` decimal places and a development warning is emitted

#### Scenario: Coordinates are compact

- **WHEN** conversion completes with the default precision
- **THEN** generated coordinates are rounded to at most four decimal places

### Requirement: Skip behavior, warnings, and empty results

Feature-level conversion problems SHALL NOT throw. A feature MUST be skipped when its geometry is `null`, is not `Polygon` or `MultiPolygon`, has no usable rings, has a non-finite coordinate, or lacks a usable id. Skipping MUST preserve the relative order of the remaining features. Warnings MUST be emitted only outside production builds and MUST NOT cause output changes. A `FeatureCollection` with no features, or one whose features are all skipped, MUST return `[]`.

#### Scenario: Unsupported geometry is skipped

- **WHEN** a collection contains Point or LineString features alongside Polygon features
- **THEN** the non-polygon features are omitted with development warnings and the polygon features are returned

#### Scenario: Null geometry is skipped

- **WHEN** a feature has `geometry: null`
- **THEN** it is omitted and the remaining features are converted

#### Scenario: Empty input returns an empty array

- **WHEN** the input is an empty `FeatureCollection`
- **THEN** the helper returns `[]` without throwing

#### Scenario: Production stays quiet

- **WHEN** conversion runs in a production build
- **THEN** skip conditions do not emit console warnings and still produce the same output

### Requirement: Runtime isolation and server safety

The helper MUST add no runtime dependency, MUST NOT access `window`, `document`, or browser layout APIs, and MUST be a pure synchronous function safe to call in Node.js and during server rendering. Calling it twice with the same input and options MUST produce equal output. The published package MUST document the helper's approximate gzip size and enforce a dedicated size budget for the `turkey-map-react/geojson` entry without changing the existing root and core budgets.

#### Scenario: Runs without a browser

- **WHEN** `geoJsonToCities` is called in a Node.js process with no DOM
- **THEN** it returns the same cities as in a browser and does not throw

#### Scenario: Repeated calls are deterministic

- **WHEN** the same input and options are converted twice
- **THEN** both results are deeply equal

#### Scenario: Size is bounded and documented

- **WHEN** the package is built and the bundle-size check runs
- **THEN** the helper entry stays within its documented gzip budget and the root and core budgets are unchanged

### Requirement: Documentation covers usage and limitations

The readme SHALL list `turkey-map-react/geojson` in its entry-point table, show a conversion example, and state that the helper is excluded from the default bundle. A dedicated guide SHALL document the accepted input shapes, every option, key-mapping examples, rendering the result as `data`, and the limitations of the default projection, including that it is a simple equirectangular scaling rather than a true map projection, that there is no dateline handling, and that ids must be unique and suitable for use as DOM ids.

#### Scenario: Readme shows the entry point and example

- **WHEN** a consumer reads the readme entry-point section
- **THEN** it explains what `turkey-map-react/geojson` provides, that it is separate from the default bundle, and how to render its output

#### Scenario: Limitations are documented

- **WHEN** a consumer reads the GeoJSON guide
- **THEN** it states the supported geometry types, the projection limitations, and the id uniqueness requirement
