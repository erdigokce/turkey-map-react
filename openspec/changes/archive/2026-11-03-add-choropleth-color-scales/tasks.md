## 1. Baseline

- [x] 1.1 Run `npm test` and `npm run typecheck` to confirm a passing baseline before touching `src/`.
- [x] 1.2 Inspect `src/__tests__/TurkeyMap.theming.test.tsx`, `src/__tests__/TurkeyMap.tooltip.test.tsx`, `tests/fixtures/cities.ts`, and `tests/helpers.ts` to reuse existing assertion and fixture patterns.

## 2. Public types and the scale module

- [x] 2.1 Add `ChoroplethValues = Record<string, number>`, `ColorScaleFunction = (value: number) => string`, `ColorScale = string[] | ColorScaleFunction`, and `ScaleType = "linear" | "quantize" | "quantile" | "threshold"` to `src/types.ts`.
- [x] 2.2 Add `values`, `colorScale`, `scaleType`, `thresholds`, `noDataColor`, `getColor`, and `animateValues` as optional `TurkeyMapProps` fields without changing existing fields.
- [x] 2.3 Create `src/color-scale.ts` with finite-value filtering, min/max domain derivation, sorted-value helpers, color-array normalization, the default `["#f7fbff", "#08306b"]` palette, and `#rgb` / `#rrggbb` parsing plus sRGB blending.
- [x] 2.4 Implement the `linear` resolver: clamp the normalized value, find the color segment, interpolate adjacent hex stops, and fall back to the nearer stop for non-hex colors.
- [x] 2.5 Implement the `quantize` resolver with equal-width buckets and maximum values landing in the last bucket.
- [x] 2.6 Implement the `quantile` resolver with d3-style `j / n` boundaries over sorted values and deterministic tie handling.
- [x] 2.7 Implement the `threshold` resolver: sort thresholds, count thresholds at or below the value, clamp the index, and fall back to `quantize` with a development warning when `thresholds` is missing or the color count is not `thresholds.length + 1`.
- [x] 2.8 Handle collapsed `min === max` domains by returning the last color for linear/quantize/quantile while leaving threshold boundary comparison intact.
- [x] 2.9 Implement `createColorResolver` with precedence `getColor` > function `colorScale` > array `colorScale` > `noDataColor`, skip `getColor` for no-data provinces, and fall through on empty/non-string outputs.
- [x] 2.10 Re-export the new public types from `src/core.tsx` and `src/index.tsx`.

## 3. Component integration

- [x] 3.1 Resolve `noDataColor` through `noDataColor ?? cssVar("tm-no-data-color", "#eeeeee")` and build the choropleth resolver in `CoreTurkeyMap` with `useMemo` keyed by the values, scale, thresholds, `getColor`, and no-data color inputs.
- [x] 3.2 Compute one resolved choropleth color per city and pass it plus `choroplethActive`, `animateValues`, and the reduced-motion flag to `Province` without breaking memoized province rendering.
- [x] 3.3 Update the `ProvinceComponent` path-style branch so disabled uses `disabledColor`, choropleth selected/hovered/idle keeps the value or no-data fill, and non-choropleth maps keep the current idle/hover/selected fill precedence.
- [x] 3.4 Compose outlines: selected uses `selectedStroke` / `selectedStrokeWidth`, hovered non-selected uses `hoverColor` with width `Math.max(1, numeric general width)`, idle uses the general stroke, and selected wins over hover.
- [x] 3.5 Keep `mergeDefined(basePathStyle, getCityStyle(city, state))` last so `getCityStyle` can still override the choropleth fill, outline, and transition.
- [x] 3.6 Emit `transition: "fill 300ms ease"` only when choropleth mode is active, `animateValues` is true, and reduced motion is not preferred; emit no transition otherwise.
- [x] 3.7 Pass `getFiniteValue(values, city.id)` as the second argument to `renderTooltip`, leaving it `undefined` without a finite value.

## 4. Scale unit tests

- [x] 4.1 Add `src/__tests__/color-scale.test.ts` covering default palette, color normalization, finite-value filtering, and hex parsing/blending.
- [x] 4.2 Cover `linear` endpoint colors, midpoint blending, multi-stop interpolation, non-hex stop fallback, and collapsed domains.
- [x] 4.3 Cover `quantize` bucket boundaries including the minimum and maximum values.
- [x] 4.4 Cover `quantile` equal-count behavior, duplicate values, and collapsed domains.
- [x] 4.5 Cover `threshold` bucket assignment, unsorted thresholds, the missing/mismatched fallback to quantize, and threshold ignoring a constant domain.
- [x] 4.6 Cover function `colorScale` raw-value calls and `scaleType` being ignored, `getColor` precedence and arguments, no-data skipping, and empty/non-string output fallthrough.

## 5. Component tests

- [x] 5.1 Add `src/__tests__/TurkeyMap.choropleth.test.tsx` covering value fills, `noDataColor`, the `--tm-no-data-color` default expression, an empty values object, invalid/non-finite values, and ignored unknown ids.
- [x] 5.2 Add tests proving `values` omitted leaves existing idle/hover/selected/disabled/`customStyle`/`getCityStyle` rendering and existing snapshots unchanged.
- [x] 5.3 Add tests for hover keeping the value fill with the hover outline, selection keeping the value fill with the selected stroke, selected-over-hover, and disabled keeping the disabled fill.
- [x] 5.4 Add tests for `getCityStyle` overriding the choropleth fill and outline, and for no-data provinces receiving the same interaction outlines.
- [x] 5.5 Add tests for `animateValues` emitting the fill transition, no transition when omitted, and no transition under reduced motion, including a runtime preference change.
- [x] 5.6 Extend tooltip tests for the second `renderTooltip` argument: supplied value, missing province value, and `values` omitted.
- [x] 5.7 Add SSR coverage for a map with `values`, `animateValues`, and `renderTooltip`, and confirm no browser globals are required.
- [x] 5.8 Verify province render isolation still holds when values change (affected provinces update, hover/focus stays local).

## 6. Documentation

- [x] 6.1 Add a choropleth guide (`docs/choropleth.md`) documenting the `values` contract, city-id keys, no-data behavior, all four scale types, `thresholds`, `getColor`, transitions, and interaction composition.
- [x] 6.2 Add a choropleth example to `readme.md` and link the new guide from the documentation table and feature summary.
- [x] 6.3 Add the new props and exported types to `docs/api.md`, including the scale-type and threshold rules.
- [x] 6.4 Update `docs/styling.md` with `--tm-no-data-color`, the choropleth precedence note, and how hover/selected outlines compose with value fills.
- [x] 6.5 Update `scripts/test-types.js` with `values`, `colorScale` array/function forms, `getColor`, all scale types, and the new exported types.

## 7. Verification

- [x] 7.1 Run `npm run typecheck` and `npm run test:coverage`; resolve regressions.
- [x] 7.2 Run `npm run clean-build`, `npm run test:artifact`, `npm run test:types`, and `npm run test:bundle-size`.
- [x] 7.3 Confirm no runtime dependency was added and the default entry stays under the 15 kB gzip budget.
- [x] 7.4 Run `openspec validate add-choropleth-color-scales --strict` and fix any spec formatting or scenario issues.
