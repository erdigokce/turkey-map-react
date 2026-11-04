## 1. Public types and input normalization

- [x] 1.1 Create `src/geojson.ts` with the public structural GeoJSON types (`GeoJsonPosition`, `GeoJsonPolygon`, `GeoJsonMultiPolygon`, `GeoJsonFeature`, `GeoJsonFeatureCollection`), the key accessor/projection types, `GeoJsonViewBox`, `GeoJsonToCitiesOptions`, and the `CityType` output import as a type-only import.
- [x] 1.2 Implement top-level input normalization for `FeatureCollection` and `Feature`, throwing a descriptive `TypeError` for `null`, non-objects, unknown `type`, a non-array `features`, or a `Feature` without a `geometry` key.
- [x] 1.3 Implement option normalization for `viewBox` (finite positive width/height, default component viewBox), `padding` (finite `>= 0`, default `0`), and `precision` (non-negative integer, default `4`), including development-only warnings.
- [x] 1.4 Add a development-only warning helper gated by `typeof process !== "undefined" && process.env.NODE_ENV !== "production"` so the module stays browser- and SSR-safe.

## 2. Metadata mapping

- [x] 2.1 Implement `idKey`, `nameKey`, and `plateKey` resolution for both property-name strings and `(properties, feature, index)` accessor functions, with defaults `"id"`, `"name"`, and `"plateNumber"`.
- [x] 2.2 Convert ids to trimmed strings, skip features with a missing/empty/unusable id, fall back from a missing name to the id, and coerce missing/non-numeric plate values to `0` while parsing numeric strings.
- [x] 2.3 Preserve duplicate ids in output and emit a development warning describing the duplicate.

## 3. Geometry conversion

- [x] 3.1 Implement extraction of every ring from `Polygon` and `MultiPolygon` geometry, treating the first ring of each polygon as exterior and the rest as holes.
- [x] 3.2 Validate rings (finite coordinates, at least three distinct positions after removing an optional closing duplicate) and skip the owning feature with a development warning when a ring is unusable.
- [x] 3.3 Implement ring winding normalization and emit each ring as an absolute `M ... L ... Z` subpath so holes render under the component's default nonzero fill rule without a `fillRule` prop.
- [x] 3.4 Implement compact coordinate serialization with the configured precision, no negative zero, and no duplicate consecutive commands.

## 4. Projection and viewBox fitting

- [x] 4.1 Implement the default equirectangular projection (`x = lon`, `y = -lat`) and the `project(lon, lat)` override, calling the hook once per position and rejecting non-finite or malformed results by skipping the owning feature with a warning.
- [x] 4.2 Compute one collection-wide projected bounding box, apply a single uniform scale and centered translation into the target viewBox rect inset by `padding`, and handle degenerate spans without producing non-finite coordinates.
- [x] 4.3 Guarantee that features are fitted together (not individually) and that empty or fully skipped input returns `[]`.

## 5. Unit tests and fixture

- [x] 5.1 Add a small `tests/fixtures/geojson.ts` containing a `Polygon` with a hole, a `MultiPolygon`, and enough metadata variants to exercise custom keys.
- [x] 5.2 Add `src/__tests__/geojson.test.ts` covering Polygon and MultiPolygon conversion, hole subpaths, winding, custom key strings and accessor functions, metadata fallbacks, and numeric-string plate values.
- [x] 5.3 Add tests for default and custom `viewBox`, uniform fitting/centering, padding, precision rounding, custom `project`, and shared coordinates across features.
- [x] 5.4 Add tests for skipped Point/LineString/null geometry, missing ids, degenerate rings, non-finite coordinates, non-finite projection output, duplicate-id warnings, empty input, and top-level `TypeError` cases.
- [x] 5.5 Add tests for option fallbacks, production warning suppression (via `NODE_ENV`), determinism, and the absence of `window`/`document` access so the project's 100% coverage threshold still passes.

## 6. Entry point and packaging

- [x] 6.1 Add the `"./geojson"` subpath to `package.json#exports` with `types`, `require`, and `default` pointing at `lib/geojson.d.ts` / `lib/geojson.js`; confirm `npm run build` emits both files.
- [x] 6.2 Add `lib/geojson.js` and `lib/geojson.d.ts` to the required-file list in `scripts/test-package.js` and extend both CJS and ESM package smoke tests to import `geoJsonToCities` and convert the fixture.
- [x] 6.3 Extend `scripts/test-types.js` to import `geoJsonToCities` and the public GeoJSON types from `turkey-map-react/geojson`, and type-check the options and `CityType[]` result.
- [x] 6.4 Add a `geojson` entry with a `5 KiB` gzip budget to `scripts/check-bundle-size.js` while leaving the root and core budgets unchanged.
- [x] 6.5 Add `tests/artifact/geojson.test.ts` that requires `lib/geojson.js`, converts the fixture, renders the result through the built `CoreTurkeyMap`, and asserts the generated paths and hole subpaths reach the DOM.

## 7. Documentation

- [x] 7.1 Add `docs/geojson.md` covering accepted input shapes, every option, key-mapping examples, rendering the result as `data`, bundle isolation, and the projection/id limitations.
- [x] 7.2 Add `turkey-map-react/geojson` to the readme entry-point table, add a conversion example, and state that the helper is not part of the default bundle.
- [x] 7.3 Cross-link the new guide from `docs/custom-data.md` and the readme documentation table.

## 8. Verification

- [x] 8.1 Run `npm run typecheck` and fix any type errors in the helper, tests, and consumer smoke test.
- [x] 8.2 Run `npm test` with coverage and confirm the new module meets the existing thresholds.
- [x] 8.3 Run `npm run clean-build`, `npm run test:bundle-size`, `npm run test:artifact`, `npm run test:package`, and `npm run test:types`.
- [x] 8.4 Confirm the root and core bundles still exclude the helper and that no package dependency was added.
