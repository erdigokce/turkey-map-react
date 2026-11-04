## Why

Consumers who already have GeoJSON for Turkish provinces, districts, or non-Turkey geographies must hand-convert every polygon into the component's SVG path space before they can render it. That geometry conversion is the hardest part of adopting the library, and today the only supported input is pre-baked `path` strings. Issue #65 asks for a first-class, dependency-free converter so custom geography becomes a one-call operation.

## What Changes

This change is **additive and non-breaking**. It adds a new standalone helper; `<TurkeyMap />`, `turkey-map-react/core`, `turkey-map-react/data`, every existing prop, public type, callback, legacy DOM id, and default rendering stay unchanged. No consumer migration is needed.

- Add `geoJsonToCities(geoJson, options?)`, exported from a new `turkey-map-react/geojson` entry point, returning `CityType[]` that can be passed directly as `data={{ cities }}`.
- Accept a GeoJSON `FeatureCollection` or a single `Feature` whose geometry is `Polygon` or `MultiPolygon`. Features with any other geometry type, a missing geometry, or unusable rings are skipped with a development warning; a malformed top-level value throws a clear `TypeError`.
- Convert `Polygon` and `MultiPolygon` geometries, preserving interior rings as holes. Rings are normalized to a consistent winding order so holes render with the component's default `nonzero` fill rule without changing the component.
- Project longitude/latitude into the component's viewBox coordinate space. The default is a simple equirectangular scale with y flipped, uniformly fitted and centered into the target viewBox.
- Allow a custom projection through `project?: (lon, lat) => [x, y]`; the projected result is still fitted into the target viewBox so custom projections do not need to know its dimensions.
- Provide key mapping through `idKey`, `nameKey`, and `plateKey`, each accepting a property name or an accessor function. Defaults are `"id"`, `"name"`, and `"plateNumber"`; a feature without an id is skipped, a missing name falls back to the id, and a missing/non-numeric plate number becomes `0`.
- Expose `viewBox` (defaulting to the component's default viewBox), `padding`, and `precision` options so output coordinates are predictable and compact.
- Keep the helper out of the root, core, and data bundles. Add a package subpath, a published declaration file, a package smoke test, a type smoke test, and a documented size budget for the new entry.
- Add Jest tests with a small fixture GeoJSON covering `Polygon`, `MultiPolygon`, holes, custom keys, custom projection, skipped geometry, empty input, and rendering the output through `CoreTurkeyMap`; document the helper and its limitations in the readme and a new guide.

**Explicitly out of scope:** true cartographic projections (Mercator, Albers, `d3-geo` or any other runtime dependency), TopoJSON, `GeometryCollection`, `Point` / `LineString` / other geometry types, CRS reprojection, fetching or parsing remote files, map projection distortion correction, dateline/antimeridian handling, geometry simplification, topology repair, automatic plate-number inference, runtime validation beyond the documented skip rules, and any change to `CityType`, the component API, or existing entry points.

## Capabilities

### New Capabilities

- `geojson-conversion`: the `turkey-map-react/geojson` entry point, `geoJsonToCities` input and option contracts, Polygon/MultiPolygon path generation with holes, default and custom projection, viewBox fitting, key mapping and fallbacks, skip rules, dependency/bundle isolation, and output compatibility with `Data` / `CityType`.

### Modified Capabilities

- None. The helper is a new standalone entry point and does not change any existing requirement. Adding a new package subpath is covered by the new capability.

## Impact

- **Public API:** new `turkey-map-react/geojson` subpath exporting `geoJsonToCities` plus the public GeoJSON input, option, accessor, and projection types. No existing export is removed, renamed, or made required.
- **Code:** new `src/geojson.ts` helper (pure TypeScript, no React import) with path generation and projection internals; `package.json` `exports` entry; `scripts/check-bundle-size.js`, `scripts/test-package.js`, and `scripts/test-types.js` coverage for the new entry.
- **Tests/docs:** new `src/__tests__/geojson.test.ts` with a small fixture; new `tests/artifact/geojson.test.ts` against the built `lib/geojson.js`; `readme.md` entry-point table, feature summary, and example; new `docs/geojson.md` guide; cross-link from `docs/custom-data.md`.
- **Dependencies:** none added. Zero runtime dependencies, React >=16.8 peer dependencies, and server-side rendering remain intact. The default and core gzip budgets are unchanged because the helper is never imported by those entries; the new entry gets its own small budget.
- **Compatibility:** purely additive. Consumers who never import `turkey-map-react/geojson` see no code, type, or bundle change.
