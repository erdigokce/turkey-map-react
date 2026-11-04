## Context

See `proposal.md` for motivation and `specs/` for the behavior contract. The implementation lives in a single component tree:

- `src/core.tsx` owns `CoreTurkeyMap`, the container `<div>`, the root `<svg>`, the province group `<g id="turkiye">`, tooltip state, and every interaction callback. Provinces are `React.memo` components whose hover/focus state is local, and interaction callbacks are read through a `latest` ref so replacing callbacks does not invalidate memoization.
- `src/index.tsx` is a thin `React.FC` wrapper that injects the built-in dataset. Both the root and `turkey-map-react/core` entries expose this component.
- `src/types.ts` is the public type surface. There is no `forwardRef` usage today.
- Tooltip city anchoring uses `getBoundingClientRect()` in `getTooltipCityStyle`; cursor anchoring uses pointer page/client coordinates.
- The test environment is jsdom, which has no layout engine: `getBBox`, `getScreenCTM`, and meaningful `getBoundingClientRect` values are unavailable unless stubbed. Jest enforces 100% statements/functions/lines and 95% branches.
- The project ships zero runtime dependencies, supports React >=16.8, and guards the data-free core entry at 15 KiB gzip.

## Goals / Non-Goals

**Goals:**

- Add an opt-in viewport transform that moves the whole province group without re-rendering provinces.
- Keep all viewport math in a small pure module so clamping, centering, and pointer-anchored zoom are unit-testable without DOM layout.
- Support both controlled and uncontrolled viewport state with a public `Viewport` shape.
- Expose a stable `TurkeyMapRef` whose methods work in controlled and uncontrolled modes and are safe before mount or on the server.
- Preserve the existing province roving-tabindex/keyboard model and tooltip semantics.

**Non-Goals:**

- Rotation, inertia, animated transitions, or a minimap.
- Custom control rendering, control placement, or a general controls API.
- Persisting viewport state or syncing it to URL/storage.
- Reworking the province keyboard model or adding per-province zoom targets.
- Changing container, SVG, tooltip, or province element structure beyond additive attributes and controls.

## Decisions

### Apply the transform to the existing province group

The viewport transform is applied to the existing `<g id="turkiye">` as `transform="translate(tx ty) scale(scale)"`. That group already contains exactly the province elements, keeps its role/label, and is the element whose bounds the tooltip and city lookup already observe. This avoids a new wrapper, keeps legacy ids stable, and makes the transform compose with `cityWrapper`.

Alternatives considered:

- **Mutate the SVG `viewBox`.** Rejected because it changes the coordinate system used by tooltip/pointer math, is harder to clamp consistently, and makes the public viewport shape depend on `viewBox` mutations.
- **Add an inner transform `<g>`.** Rejected as unnecessary markup and an extra element between the listbox and its options.
- **CSS transform on the SVG.** Rejected because SVG transforms keep geometry (and `getBoundingClientRect`) coherent for tooltips and `focusCity`, and because CSS transforms complicate coordinate conversion.

Panning is clamped against the SVG `viewBox` rectangle rather than the province group's painted bounds. The viewBox is deterministic across SSR/client and does not require layout measurement. The trade-off is that the small padding inside the viewBox (currently `left: 80`) is treated as part of the map extent, so a fully zoomed-out map can show that margin. That matches the existing default framing.

### Use `scale` plus viewBox-unit translations

`Viewport` is `{ scale: number; translateX: number; translateY: number }`. The rendered transform is `translate(tx ty) scale(s)`; translation values are in SVG viewBox user units and are applied after scaling. This is the smallest shape that supports controlled mode and is independent of the rendered pixel size.

Given a content point `c`, the screen-space viewBox point is `u = s * c + t`. The pan range is:

- `translateX ∈ [(left + width)(1 - s), left(1 - s)]`
- `translateY ∈ [(top + height)(1 - s), top(1 - s)]`

At `s = 1` the range collapses to `0`, so the map is centered and not pannable. At `s > 1` the range keeps the scaled content covering the viewBox. Centering a content point is `t = center(1 - s)`.

### Centralize math in `src/viewport.ts`

A pure helper module exports normalization and clamping functions:

- `normalizeBounds(minZoom, maxZoom)` applies defaults and warnings.
- `clampViewport(viewport, viewBox, bounds)` normalizes scale and translation.
- `zoomAtPoint(viewport, point, targetScale, viewBox, bounds)` keeps `point` fixed while scaling.
- `panBy(viewport, dx, dy, viewBox, bounds)` clamps translation.
- `centerOnPoint(viewport, point, viewBox, bounds)` centers a content point.
- `toViewBoxPoint(clientX, clientY, rect, viewBox)` converts browser coordinates into viewBox coordinates.

Keeping this separate gives direct unit tests for the edge cases that are hard to exercise through jsdom and prevents the component from accumulating geometry branches.

### Convert `CoreTurkeyMap` to `forwardRef` and keep the handle stable

`CoreTurkeyMap` becomes a `forwardRef<TurkeyMapRef, CoreProps>` component. `src/index.tsx` wraps it in another `forwardRef` and forwards the ref to the core component, preserving dataset injection. `TurkeyMapRef` and `Viewport` are exported from `src/types.ts` and re-exported from both entries.

`useImperativeHandle` exposes a handle whose methods read from refs (`effectiveViewportRef`, `viewBoxRef`, `cityDataRef`, a DOM lookup map, and `applyViewportRef`) rather than closing over render values. This keeps the handle stable and avoids re-running it on every viewport frame. Methods are no-ops when the DOM is unavailable.

`focusCity` finds the city by id in `cityData`, locates its `<g data-tm-city-id>` element, and uses `getBBox()` to obtain local content coordinates (the province group's coordinate space before the transform). If `getBBox` is missing or returns a zero-size box, the method emits a development warning and does nothing; this is the jsdom/`display:none` case and keeps tests explicit about stubbing layout. The default focus scale is `clamp(max(currentScale, 2), minZoom, maxZoom)`; an explicit second argument is treated as an absolute scale.

### State model mirrors selection: controlled wins, uncontrolled updates itself

Viewport state uses the same pattern as selection:

- `internalViewport` is initialized from normalized `minZoom` and carried in state.
- `viewport !== undefined` makes the map controlled.
- `effectiveViewport` is the normalized controlled value or the internal value.
- One `applyViewport(next, source)` function normalizes, skips no-op changes with an epsilon comparison, updates internal state when uncontrolled, and calls `onViewportChange`. It is stored in a ref so the imperative handle and native listeners always see the latest version.
- The callback is never invoked for mount or plain prop changes. Controlled gestures call `onViewportChange` but do not set internal state, matching the existing controlled-selection contract.

`minZoom`/`maxZoom` normalization runs during render through the pure helper; development warnings run in an effect, consistent with the existing selection warnings.

### Native wheel listener, React pointer handlers, and click suppression

Wheel must call `preventDefault()` to avoid scrolling the page, and React's delegated wheel listener is not reliably non-passive across browsers. When `zoomable` changes to `true`, a `useEffect` attaches a native `wheel` listener to the SVG ref with `{ passive: false }` and removes it on cleanup. Deltas are normalized for `deltaMode` and converted to a zoom factor per event.

Drag and pinch use React pointer handlers on the SVG. A `Map<pointerId, point>` tracks active pointers. The first primary pointer starts a pan or a potential tap; a second pointer converts the gesture to pinch. Pointer capture is attempted on the SVG and guarded for environments that do not implement it. `touch-action: none` is applied to the SVG only when `zoomable`, so page scrolling outside the map is unaffected.

Click suppression uses a ref set when a drag crosses the threshold. The city click handler checks the ref before calling `onClick` or selection activation, then allows the flag to clear on a zero-delay timer after pointer-up. This avoids brittleness from `preventDefault()` on click and keeps the existing province click path intact when the flag is false.

### Keyboard handling stays layered per element

The SVG gets `tabIndex={0}` and an accessible name only when `zoomable`. Its key handler ignores events whose `target` is not the SVG itself, so key presses bubbling from provinces never trigger viewport shortcuts. Province handlers keep full ownership of arrows, Home/End, Enter/Space, and Escape.

Viewport keys are `+`/`=`, `-`/`_`, arrows (pan by 10% of the viewBox), and `0` (reset). Consumer `svgProps` event handlers are composed rather than replaced.

### Zoom controls are additive container content

When `zoomControls` is enabled, a labeled `<div role="group">` with three `<button type="button">` elements renders immediately after the SVG inside the existing container. Buttons use inline layout styles, stable class names (`tm-zoom-controls`, `tm-zoom-control`), `aria-label`s, and `disabled` at the bounds. They are outside the SVG and the province group, so they do not participate in map gestures, province clicks, or the roving tabindex model.

### Tooltip reposition is an effect on viewport change

`getTooltipCityStyle` already derives the anchor from `getBoundingClientRect()`, which reflects the group transform. An effect keyed on the effective scale/translations, tooltip visibility, active city id, and `tooltipPosition` refreshes the tooltip style after the transform is committed. It does not restart the reveal timer or call `onHover`. Cursor mode keeps using pointer coordinates.

## Risks / Trade-offs

- **Wheel zoom traps page scrolling over the map** → The behavior is opt-in through `zoomable`; `preventDefault` runs only when the map is zoomable, and the docs call out the interaction. Consumers who want scroll-through can omit `zoomable` or wrap/logically gate the map.
- **`touch-action: none` can block page scroll on touch** → Applied only to a zoomable SVG; the rest of the page scrolls normally. Documented as an explicit trade-off of enabling gestures.
- **jsdom and hidden maps lack `getBBox`/layout** → All geometry helpers guard missing APIs; `focusCity` warns and no-ops rather than throwing, and tests stub `getBBox`/`getBoundingClientRect` explicitly.
- **Controlled mode can fight internal gesture state** → Only `onViewportChange` is emitted in controlled mode; internal state is not updated, and values are normalized before emission. This matches the existing controlled-selection contract.
- **Per-pointermove state updates could be costly** → Provinces stay memoized and receive no viewport props, so only the province group transform changes. If profiling shows churn, updates can be coalesced with `requestAnimationFrame` later without changing the public contract.
- **Tooltip drift after zoom/pan** → The viewport-change effect re-reads the province's rendered bounds after the transform commits; cursor mode is unaffected.
- **Consumer `svgProps` handlers could be overwritten** → Internal handlers compose with `svgProps` handlers for key/pointer events, and existing controlled SVG attributes remain authoritative.
- **`forwardRef` and imperative handles on old React versions** → `forwardRef`/`useImperativeHandle` exist since React 16.3 and are compatible with the >=16.8 peer range. The handle reads refs rather than memoized render state to avoid stale closures.
- **Core bundle growth** → The pure helper and handlers are small and dependency-free; the existing `npm run test:bundle-size` check must still pass the 15 KiB core budget.

## Migration Plan

There is no consumer migration. The feature ships behind `zoomable`, the container/SVG/province markup and legacy ids are unchanged, and existing behavior is unchanged when the prop is omitted. Rollback is simply disabling or removing `zoomable` usage; no state is persisted and no data format changes. The v3.0 release notes should state that no breaking container markup change was required.

## Open Questions

None. The remaining choices (control styling details, future animation support, and control-label localization) do not change the specs, approach, or task breakdown.
