## Why

Coloring provinces by a metric (sales, population, election results, coverage) is the second most common map job, but today the component only exposes `idleColor` / `hoverColor`. Consumers must fork the component or wrap all 81 paths to build a choropleth, and the existing `renderTooltip` second argument is documented as always `undefined` with no value API to fill it. Issue #58 asks for a first-class, dependency-free choropleth surface on top of the now-available `getCityStyle` and custom tooltip support.

## What Changes

This change is **additive and non-breaking**. `<TurkeyMap />`, every existing prop, `customStyle`, `getCityStyle`, disabled behavior, selection behavior, legacy DOM ids, and default rendering keep working when the new props are omitted. A map with no `values` prop renders exactly as it does today.

- Add `values?: Record<string, number>`, keyed by city `id`. Provinces with a finite value are colored from the scale; provinces without one use `noDataColor`.
- Add `colorScale?: string[] | ((value: number) => string)`. The array form is interpreted by `scaleType`; the function form maps a raw value to a color and bypasses `scaleType`.
- Add `scaleType?: "linear" | "quantize" | "quantile" | "threshold"` with a default of `"linear"`.
  - `linear` interpolates the color array across the value domain.
  - `quantize` splits the `[min, max]` domain into `colorScale.length` equal-width buckets.
  - `quantile` derives bucket boundaries from the supplied values.
  - `threshold` uses `thresholds` (N thresholds, N+1 colors).
- Add `thresholds?: number[]`, used by `scaleType="threshold"` and ignored by the other scale types.
- Add `noDataColor?: string` for provinces without a finite value. Its default is the documented `--tm-no-data-color` CSS custom property with an `#eeeeee` fallback.
- Add `getColor?: (value: number, city: CityType) => string` as an escape hatch that takes precedence over `colorScale`.
- Add `animateValues?: boolean`. When values change, province fills transition; with `prefers-reduced-motion: reduce` the change is instant.
- Compose interaction with choropleth fills: the value fill stays visible, hover is indicated with the existing hover color as a province outline, selection uses the existing selected stroke, and disabled provinces keep the disabled fill. `getCityStyle` remains the highest-precedence style layer.
- Pass the province's current value as the second `renderTooltip` argument when `values` is supplied, otherwise keep the existing `undefined`.
- Update Jest / @testing-library tests, the TypeScript consumer smoke test, the readme, and the API/styling docs with the data contract and examples.

**Explicitly out of scope:** the Legend component (#59), a configurable value `domain`, logarithmic/power/diverging scales, color-blind-safe palette selection, adding `d3-scale` or any other runtime dependency, fetching/aggregating data, per-province `className`, gradients, dark-mode detection, a configurable transition duration, and defining new meaning for non-finite or non-number values beyond treating them as "no data".

## Capabilities

### New Capabilities

- `choropleth`: `values`, color-scale construction for all four scale types, `noDataColor`, `getColor` precedence, value-driven fill transitions, tooltip value propagation, and composition with hover, selection, disabled, `customStyle`, and `getCityStyle` states.

### Modified Capabilities

- `tooltip`: the second `renderTooltip` argument is no longer always `undefined`; it carries the province's current choropleth value when values are supplied.
- `map-theming`: adds the documented `--tm-no-data-color` CSS custom property and records choropleth fill/stroke composition in the existing precedence chain.

## Impact

- **Public API:** new optional props `values`, `colorScale`, `scaleType`, `thresholds`, `noDataColor`, `getColor`, and `animateValues`; new exported types `ChoroplethValues`, `ColorScale`, `ColorScaleFunction`, and `ScaleType`. No existing prop is removed, renamed, or required, and `renderTooltip` keeps its optional second argument shape.
- **Code:** new internal scale module (no dependency) under `src/`; `src/types.ts` prop/type additions; `src/core.tsx` fill resolution, interaction-outline composition, value transitions, and tooltip value wiring; `src/index.tsx` and `src/core.tsx` type re-exports; new choropleth test file plus updates to tooltip, theming, interaction, snapshot, SSR, and artifact tests/helpers.
- **Docs/tooling:** `readme.md` feature summary and data-contract section; `docs/api.md` props/types tables; `docs/styling.md` precedence and `--tm-no-data-color`; `scripts/test-types.js` consumer usage.
- **Dependencies:** none. React >=16.8 peer dependency, zero runtime dependencies, and the <15 kB gzip default entry budget are preserved; the scale module is small and lives in the shared core chunk.
- **Compatibility:** default output is unchanged. Value-driven fill, no-data styling, outlines, and transitions only appear when `values` is supplied. `renderTooltip`'s second argument remains optional and is `undefined` without `values`, so single-argument renderers continue to type-check.
