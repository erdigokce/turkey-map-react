## Context

See `proposal.md` for motivation and `specs/choropleth/spec.md` for the behavior contract.

The current map derives every province path style locally in `ProvinceComponent` (inside `src/core.tsx`) and merges it through this chain: disabled > selected > hovered > idle fill; selected stroke over the general stroke; then `getCityStyle(city, state)` last via `mergeDefined`. Theme values resolve from `customStyle`, documented `--tm-*` CSS variables, and defaults. Interaction hover/focus state is local to each `Province`, and `Province` is memoized so entering one province does not re-render the other 80. `usePrefersReducedMotion` already provides SSR-safe reduced-motion detection for the tooltip. `renderTooltip` is currently called as `renderTooltip(tooltipCity, undefined)` in `src/core.tsx`.

The component is a public library with React >=16.8, zero runtime dependencies, a <15 kB gzip default entry budget, an existing snapshot, and tests that assert inline styles and province render isolation. Values must therefore arrive as optional props, scale construction must stay dependency-free and cheap, and default output must not change.

## Goals / Non-Goals

**Goals:**

- Implement all four scale types as pure, deterministic, unit-testable functions with no `d3-scale` or other dependency.
- Resolve one choropleth fill per city before rendering, then compose interaction states without hiding the metric.
- Keep the existing per-province render isolation: changing values re-renders only affected provinces where practical, and hover/focus remains local.
- Preserve default rendering, tooltip behavior, disabled behavior, theming precedence, SSR, and the bundle budget.
- Make the public data contract explicit and type-safe.

**Non-Goals:**

- A configurable value domain, log/power scales, or a legend component.
- Changing selection, disabled, focus, tooltip, or theming semantics beyond the documented composition rules.
- Per-province class names, gradients, color-blind-safe palette generation, or dark-mode detection.
- A configurable animation duration or easing.
- Caching across renders or memoizing scale construction outside React.

## Decisions

### Put scale math in a pure `src/color-scale.ts` module

The module owns:

- `ScaleType`, `ChoroplethValues`, `ColorScale`, `ColorScaleFunction` types.
- Reading finite values and computing min/max, sorted values, quantiles, and thresholds.
- Hex parsing/blending and the four array-based resolvers.
- A `createColorResolver(config)` function that returns `(cityId: string) => string | undefined` (or a precomputed `Map<string, string>`).

It imports no React and touches no browser globals, so it is SSR-safe and directly unit-testable.

- Alternative considered: implement the math inline in `core.tsx`. Rejected because the four scales plus interpolation and quantile boundaries are the part most likely to regress, and pure functions are far easier to test exhaustively.
- Alternative considered: adopt `d3-scale` / `d3-interpolate`. Rejected by the zero-dependency constraint and the entry budget.

### Resolve choropleth fills once per render

`CoreTurkeyMap` builds a resolver with `useMemo` keyed by `values`, `colorScale`, `scaleType`, `thresholds`, `getColor`, and the resolved `noDataColor`:

```
const choropleth = useMemo(
  () => createColorResolver({ values, colorScale, scaleType, thresholds, getColor, noDataColor }),
  [values, colorScale, scaleType, thresholds, getColor, noDataColor],
);
```

The resolver returns `undefined` when no value exists. The parent computes a stable `choroplethColor` per city and passes it to `Province` along with a boolean `choroplethActive`. The parent also passes `animateValues` and a `reduceMotion` flag.

- `choroplethActive` is `values !== undefined`, not "at least one value", so an empty object consistently means "all no-data" and does not silently fall back to idle colors.
- Scale construction is cheap (81 values, at most a small color array); memoization only avoids redoing it on unrelated parent state updates such as selection or tooltip visibility.
- Alternative considered: resolve colors inside each `Province` from raw props. Rejected because it would duplicate domain/quantile work 81 times and force every province memo comparison to carry the whole values object.

### Array scales follow d3 semantics, reduced to what the API exposes

- **Domain:** derived from all finite supplied values. There is no public domain prop.
- **Default palette:** `["#f7fbff", "#08306b"]` when `colorScale` is omitted, so `values` alone produces a usable map.
- **Normalization:** keep only string entries; an empty or unusable array falls back to the default palette.
- **linear:** clamp `t = (value - min) / (max - min)` to `[0, 1]`; map it to a segment between adjacent stops, then blend the two hex endpoints in sRGB. `#rgb` and `#rrggbb` are parsed; non-hex stops are treated as non-interpolable, so the nearer stop is used rather than guessing a color space.
- **quantize:** `index = min(n - 1, floor(t * n))` for `n` colors. The maximum value lands in the last bucket.
- **quantile:** compute boundaries `j / n` for `j = 1..n-1` over the sorted finite values using d3-style linear interpolation, then `index = count(boundary <= value)`. This yields roughly equal-count buckets and handles ties deterministically.
- **threshold:** sort `thresholds` ascending; `index = min(n - 1, count(threshold <= value))`. `n` must equal `thresholds.length + 1`; otherwise fall back to quantize with a development warning so a misconfiguration never throws.
- **Collapsed domain:** for linear/quantize/quantile, `min === max` returns the last color, avoiding `0 / 0` NaN indexing. Threshold still compares against its thresholds because it does not depend on the domain.

- Alternative considered: use quantize thresholds as user-supplied bucket edges. Rejected by the confirmed decision to keep d3 semantics: `thresholds` belongs to `scaleType="threshold"`.
- Alternative considered: interpolate in Lab/OKLCH. Rejected because it requires color-space conversion code for a marginal visual gain and would complicate the zero-dependency contract; the docs state that linear uses sRGB blending of hex stops.

### Function scales and `getColor` are escape hatches, with explicit precedence

Per province, color resolution is:

1. A finite value is required; otherwise the resolver returns no color and the province uses `noDataColor`.
2. `getColor(value, city)` if supplied.
3. `colorScale` function if supplied (called with the raw value; `scaleType` is ignored).
4. `colorScale` array interpreted by `scaleType`.
5. `noDataColor`.

Empty, non-string, or `undefined` outputs from `getColor` or a function scale fall through to the next step instead of producing an invalid SVG fill. `getColor` is never called for no-data provinces so consumers can rely on it only seeing real data. The final style layer remains `getCityStyle`, which can override the fill and outline for any province.

- Alternative considered: let `getColor` receive no-data values too. Rejected because it would force every consumer to re-implement the no-data branch and contradicts `noDataColor` being the explicit missing-value API.
- Alternative considered: make the function form receive a normalized `t`. Rejected because the issue already provides `getColor` for value+city logic, while a raw-value function is the least surprising replacement for an array.

### Compose interaction states through fill and outline roles

In `ProvinceComponent`, the base style becomes:

| State | Fill | Stroke | Stroke width |
| --- | --- | --- | --- |
| Disabled | `disabledColor` | general stroke | general width |
| Choropleth, selected | choropleth/no-data color | `selectedStroke` | `selectedStrokeWidth` |
| Choropleth, hovered | choropleth/no-data color | `hoverColor` | at least `1` |
| Choropleth, idle | choropleth/no-data color | `strokeColor` | `strokeWidth` |
| No `values`, selected | `selectedColor` | `selectedStroke` | `selectedStrokeWidth` |
| No `values`, hovered | `hoverColor` | `strokeColor` | `strokeWidth` |
| No `values`, idle | `idleColor` | `strokeColor` | `strokeWidth` |

- The selected stroke wins over the hover stroke, matching the existing "selected over hover" rule.
- `hoverColor` becomes an outline in choropleth mode so the metric fill stays readable. The hover width is `Math.max(1, numeric general stroke width)`; a CSS-variable general width cannot be numerically compared, so it falls back to `1`.
- `selectedColor` is intentionally unused in choropleth mode; `selectedStroke` / `selectedStrokeWidth` already exist and keep selection obvious.
- Disabled always wins, matching `disabled-cities`. No hover outline is added because disabled provinces do not emit hover behavior.
- `getCityStyle` runs last through the existing `mergeDefined`, so it can override any of the above, including the fill.

- Alternative considered: replace the fill with `hoverColor` / `selectedColor` as today. Rejected by the confirmed decision: hover/selection must not hide the metric.
- Alternative considered: use `opacity` for hover. Rejected because hover would wash out the color and interact poorly with adjacent buckets; an outline is clearer and reuses existing theme colors.
- Alternative considered: apply the overlay on the group instead of the path. Rejected because focus styling lives on the group and path styling is what tests and `getCityStyle` already target.

### Animate fills with a CSS transition only when asked and allowed

When `choroplethActive && animateValues && !prefersReducedMotion`, the path style includes `transition: "fill 300ms ease"`. Otherwise no `transition` is emitted. Fill is the only transitioned property, so hover/selection outlines, focus, disabled changes, and tooltip updates stay instantaneous.

- `prefersReducedMotion` is already tracked by `usePrefersReducedMotion` and passed to `Province`; this reuses the SSR-safe tooltip infrastructure instead of adding a second media-query listener.
- Transition strings are stable values, so memoized provinces only re-render when the resolved color or the transition flag actually changes.
- Alternative considered: animate with Web Animations or requestAnimationFrame. Rejected because CSS transitions are simpler, work with SSR markup, and need no JS timers.
- Alternative considered: animate `fill` and `fill-opacity`. Rejected as unnecessary and more likely to interfere with consumer styles.

### Forward the tooltip value without changing the renderer contract

`src/core.tsx` changes the existing call to:

```
const value = getFiniteValue(values, tooltipCity.id);
renderTooltip(tooltipCity, value);
```

`getFiniteValue` returns `undefined` for a missing key or non-finite value. The second argument remains optional in `RenderTooltipCallback`, so one-argument renderers and the existing tooltip tests continue to work. The built-in text tooltip is unchanged.

### Keep public types additive and the bundle small

Add `values`, `colorScale`, `scaleType`, `thresholds`, `noDataColor`, `getColor`, and `animateValues` to `TurkeyMapProps`, and export `ChoroplethValues`, `ColorScale`, `ColorScaleFunction`, and `ScaleType` from `types.ts`, `core.tsx`, and `index.tsx`. `noDataColor` resolves through `cssVar("tm-no-data-color", "#eeeeee")`, so `customStyle`-independent theming keeps working.

- The scale module is roughly a few hundred lines with no imports; expected added gzip weight is around 1 kB, well inside the budget.
- Alternative considered: ship a separate `turkey-map-react/choropleth` entry point. Rejected because the feature is small, is needed by the normal map, and splitting it would complicate the prop-based API for no measurable size win.

### Test at both the scale and component layers

- Pure unit tests for each scale, hex blending, default palette, constant domains, threshold sorting/fallback, function scales, `getColor` precedence, and invalid outputs.
- Integration tests for value/no-data fills, empty `values`, disabled precedence, hover/selected outlines, `getCityStyle` override, transition emission, reduced motion, tooltip value forwarding, and SSR.
- Existing snapshot/isolated-render tests should need no updates because no new style keys are emitted when `values` is absent; only new tests cover the choropleth path.

## Risks / Trade-offs

- **Inline style additions could leak into default snapshots** → emit choropleth keys only when `choroplethActive`, and keep `values` undefined in all existing tests. Verify the snapshot and rendering tests still pass unchanged.
- **jsdom cannot resolve `var(--tm-no-data-color, #eeeeee)`** → assert the emitted variable expression and separately assert literal `noDataColor` overrides, as the theming tests already do for other variables.
- **Linear interpolation cannot blend named or `rgb()` colors** → document hex (`#rgb`, `#rrggbb`) as the interpolable format and fall back to the nearer stop for other strings instead of producing `NaN`.
- **`useMemo` depends on object identity** → document that consumers should keep `values` / `colorScale` references stable; recomputation is cheap anyway, so this is a performance note, not a correctness requirement.
- **`getCityStyle` can override the choropleth fill** → this is intended and preserves the existing highest-precedence escape hatch; document that consumers using both must make the interaction explicit.
- **Quantile ties can produce uneven visual buckets** → deterministic boundary counting keeps behavior stable; document that quantile is for ranked data, not a guarantee of exact equal counts with duplicate values.
- **Hover outline width depends on a numeric stroke width** → when the general stroke is a CSS variable, use width `1` on hover; document the behavior rather than trying to parse CSS.
- **More props widen the public type surface** → new props are optional and grouped near the styling props; no existing union or callback shape changes.
- **Bundle growth** → keep the scale module dependency-free, avoid per-render allocations beyond the resolver map, and verify with `npm run test:bundle-size`.

## Migration Plan

No consumer migration. The release is additive and lands as a minor version. Existing props, datasets, `customStyle`, `getCityStyle`, callbacks, tooltips, and legacy DOM ids keep working. Consumers opt in by passing `values`. Rollback removes the new optional props and the `color-scale` module, restores the existing fill/stroke branch, and reverts the `renderTooltip` second argument to `undefined`; there is no persisted state or schema change.
