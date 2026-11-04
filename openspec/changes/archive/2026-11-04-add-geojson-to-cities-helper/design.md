## Context

See `proposal.md` — Why. The relevant current state:

- `CityType` is `{ id, name, plateNumber, path, disabled? }`; the component renders `path` directly with the SVG default `fill-rule="nonzero"` and no per-city fill-rule prop.
- The default viewBox is `{ top: 0, left: 80, width: 1050, height: 585 }`, and custom data is expected to use the same coordinate space.
- Entry points are declared in `package.json#exports`; `data` is a plain `tsc` output at `lib/data/index.js`, while `index` and `core` are bundled by webpack. `scripts/check-bundle-size.js`, `scripts/test-package.js`, and `scripts/test-types.js` encode the packaging contract.
- The project requires zero runtime dependencies, React >=16.8 peers, a <15 KiB core budget, 100% statement/function/line coverage, and readme/docs updates for new API.

## Goals / Non-Goals

**Goals:**

- Make GeoJSON conversion a pure, synchronous, dependency-free function that can run in a Node script or browser.
- Produce paths that render correctly with the existing component, including holes, without changing `CityType` or the component.
- Keep the helper completely out of the root, core, and data entries while publishing it as a first-class typed subpath.
- Make the generated coordinate space predictable and compact.

**Non-Goals:**

- Cartographic correctness or projection libraries; the default is a documented simple scaling.
- Replacing the component's data model with GeoJSON at runtime.
- Automatic topology repair, simplification, or plate-number inference.
- A generic GeoJSON utility library; only the conversion path needed by issue #65.

## Decisions

### Decision: A single `src/geojson.ts` module compiled by `tsc`, not a webpack entry

`tsc` already emits `lib/*.js` and `lib/*.d.ts` for `src/`, and `turkey-map-react/data` proves the pattern of exposing plain compiled output. A single file keeps the published size check meaningful (`lib/geojson.js` is the whole entry) and avoids splitting a small helper across modules.

- **Alternative:** add a webpack entry like `core`/`index`. Rejected because the helper has no JSX or React runtime, and bundling would add build complexity without a size benefit.
- **Alternative:** put the helper in `src/index.tsx`. Rejected: it would ship the helper in the default bundle and change its size.

### Decision: Structural GeoJSON types defined locally

The module defines its own minimal `GeoJsonFeature`, `GeoJsonFeatureCollection`, `GeoJsonPolygon`, `GeoJsonMultiPolygon`, `GeoJsonPosition`, option, and accessor types. It does not import `@types/geojson` or `./types` (whose declarations pull in React types).

- **Why:** zero runtime dependencies is mandatory, and a Node/TypeScript consumer should be able to use the helper without React installed.
- **Trade-off:** the local types are intentionally narrower than the full GeoJSON spec; unsupported types are out of scope.

### Decision: One collection-wide uniform fit into the viewBox

All positions are projected first, then one bounding box and one uniform scale/translation are computed for the whole input. Output is centered inside the viewBox rect, inset by `padding`.

- **Why:** relative positions must be preserved across provinces, and uniform scaling avoids stretching geometry. A per-feature fit would destroy relative placement; a stretch-to-fill fit would distort shapes.
- **Default viewBox:** the component's default, so the common case works with `<TurkeyMap data={{ cities }} />` without a matching `viewBox` prop.
- **Trade-off:** a wide geography leaves vertical whitespace in the default viewBox. Consumers can pass a viewBox that matches their data's aspect ratio.

### Decision: Default projection is pure equirectangular; `project` replaces only the planar mapping

Default: `x = lon`, `y = -lat`. A supplied `project(lon, lat)` returns planar `[x, y]` and is still fitted into the viewBox. Hooks are called once per position.

- **Why:** it is the simplest defensible mapping, has no dependencies, and the issue explicitly accepts "simple scaling" with documented limitations. Keeping the fit outside the hook means custom projections need not know the viewBox.
- **Alternative:** apply a `cos(mean latitude)` correction in the default. Rejected because it silently mixes projection with fitting and is still not a true projection; consumers who need it can supply `project`.
- **Limitation to document:** no Mercator/Albers, no distortion correction, no antimeridian handling.

### Decision: Normalize ring winding instead of adding `fillRule`

For each ring, compute the signed area in projected SVG coordinates and reverse the point order when needed so exterior rings and holes have opposite winding. Emit outer ring first, then holes, each as its own `M ... L ... Z` subpath.

- **Why:** the component renders paths with the SVG default nonzero rule and has no `fillRule` prop. Opposite winding guarantees holes render without changing `CityType` or the component. Relying on source winding is unsafe because real-world GeoJSON often violates the RFC 7946 winding recommendation.
- **Alternative:** add `fillRule?: "evenodd"` to `CityType` and pass it through. Rejected as a broader public API change for a problem this helper can solve internally.

### Decision: Deterministic, compact path serialization

Paths use absolute `M`, `L`, and `Z` with space-separated numbers, start with `M `, round coordinates to `precision` (default 4), and normalize `-0` to `0`. The optional duplicated closing position and consecutive duplicates are removed before emission.

- **Why:** readable output, smaller generated data, and sub-pixel accuracy at the map's scale. The built-in dataset also starts with `M `.
- **Trade-off:** very small geometries can collapse at `precision: 0`; callers choose precision.

### Decision: Skip unusable features, throw only for invalid top-level input

Top-level `null`, non-objects, unknown `type`, and `FeatureCollection` without `features` throw `TypeError`. Everything at the feature level (unsupported geometry, null geometry, bad rings/coordinates, missing id, projection failure) skips that feature and continues.

- **Why:** a wrong top-level argument is a programmer error that should fail loudly; per-feature data defects are common in real datasets and should not prevent rendering the rest. Warnings are dev-only and gated on `process.env.NODE_ENV !== "production"` with a `typeof process` guard, matching `src/core.tsx`.

### Decision: Metadata fallbacks and id handling

`id` is `String(value).trim()` and used verbatim; missing/empty ids skip the feature. `name` falls back to the id. `plateNumber` is parsed from numbers or numeric strings and falls back to `0`. Duplicate ids are preserved and warned about.

- **Why:** `CityType` requires all four fields, and the component's ARIA label includes the plate number. Silent slugification would break consumers' controlled-selection ids and callbacks, so ids stay caller-defined; docs state they must be unique and DOM-id-safe.

### Decision: Packaging and verification hooks

Add `"./geojson"` to `package.json#exports` pointing at `lib/geojson.js` / `lib/geojson.d.ts`. Add `lib/geojson.js` and `lib/geojson.d.ts` to the required package file list, add a geojson import to both CJS/ESM package smoke tests and the TypeScript consumer smoke test, and add a geojson entry with its own budget (`5 KiB` gzip) to `scripts/check-bundle-size.js`. Leave the root and core budgets untouched.

- **Why:** the repository treats entries as a tested contract, not just an `exports` line. A dedicated budget catches accidental imports of React or the dataset into the helper.
- **Bundle isolation:** no source file under `src/index.tsx`, `src/core.tsx`, or `src/data` imports `geojson`, so webpack trees cannot pull it into existing bundles.

### Decision: Test the conversion at unit and artifact levels

Unit tests live in `src/__tests__/geojson.test.ts` with a small fixture in `tests/fixtures/geojson.ts`. They cover Polygon, MultiPolygon, holes and winding, custom key accessors, custom projection, fitting, padding, precision, skip behavior, warnings, duplicate ids, and determinism. An artifact test at `tests/artifact/geojson.test.ts` requires the built `lib/geojson.js`, converts the fixture, renders the result through `CoreTurkeyMap`, and asserts the paths and hole subpaths reach the DOM.

- **Why:** the artifact test proves the published entry works with the real built component, while the unit test keeps coverage at the project's 100% threshold.

## Risks / Trade-offs

- **Uniform fit can leave unused space for wide or tall geographies** → Documented; consumers can pass a matching `viewBox` and `padding`.
- **Simple equirectangular output is not shape-accurate at high latitudes** → Explicitly documented as a limitation; `project` is the escape hatch.
- **GeoJSON ids may not be DOM-safe** → Ids are used verbatim and documented as needing uniqueness and DOM-safe characters; accessor functions let callers sanitize.
- **Holes depend on winding normalization** → Unit and artifact tests assert a hole subpath and opposite winding, and the artifact test renders the output through the real component.
- **Rounding could move a point microscopically outside the viewBox** → At four decimals the error is negligible; tests assert coordinates stay within the target rect for fixture data.
- **Coverage thresholds are strict (100% statements/functions/lines)** → Warning and fallback branches get explicit tests rather than `istanbul ignore`.
- **Duplicate ids can break React keys and DOM ids** → Preserved for data fidelity but warned about in development; docs call out uniqueness.
- **The helper's local types may not cover every GeoJSON variant** → Scope is intentionally limited to FeatureCollection/Feature with Polygon/MultiPolygon; unsupported types are skipped with warnings.

## Migration Plan

No migration is required. This is a new subpath with no changes to existing exports, props, rendering, or data shapes. Rollback is removing the `exports` entry, `src/geojson.ts`, and the related tests/docs; no stored data or consumer migration is involved.

## Open Questions

None. The remaining choices (exact fixture coordinates, doc wording) do not affect the specs, approach, or task breakdown.
