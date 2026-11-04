## Why

The map renders the whole country at a fixed scale, so it is cramped on phones and tiny in dashboard tiles. Consumers cannot zoom into a province, pan to an area of interest, or programmatically focus a province, which blocks drill-down dashboards, mobile province pickers, and map-driven detail views.

## What Changes

This change is **additive and non-breaking**. `<TurkeyMap />`, every existing prop, callback, legacy DOM id, and default rendering stay unchanged. The issue targets v3.0, but no breaking change is required: all new behavior is opt-in through `zoomable`, and the existing container/SVG markup keeps the same structure and ids. No consumer migration is needed; the v3.0 entry is a release vehicle only.

- Add `zoomable?: boolean` (default `false`). When omitted, no gestures, keyboard shortcuts, controls, transform, or extra tab stop are added.
- Add `minZoom?: number` (default `1`) and `maxZoom?: number` (default `8`) with dev warnings for invalid values.
- Add wheel, pinch, double-click, and drag-pan support:
  - wheel and double-click zoom around the pointer;
  - two-pointer pinch zooms around the pinch midpoint;
  - pointer drag pans the map;
  - zoom and pan are clamped so the map cannot be dragged out of its viewport.
- Add a click threshold so a drag that exceeds a small movement threshold suppresses the synthesized `onClick` and selection activation. Taps and keyboard activation are unchanged.
- Add controlled and uncontrolled viewport state:
  - `viewport?: Viewport` for controlled mode;
  - `onViewportChange?: (viewport: Viewport) => void` fires on user gestures and imperative calls;
  - uncontrolled mode starts at the minimum zoom and reset pan.
- Add `zoomControls?: boolean` (default `false`) to render accessible zoom-in, zoom-out, and reset buttons. Buttons have labels, disabled states at the limits, and do not become an extra tab stop unless rendering them is requested.
- Add a typed imperative ref API via `TurkeyMapRef`:
  - `focusCity(cityId: string, zoom?: number)` centers a province, optionally at a target zoom;
  - `zoomTo(scale: number)` sets an absolute zoom level around the current center;
  - `resetView()` returns to the minimum zoom and centered pan.
- Add opt-in keyboard zoom and pan (`+`/`=`/`-`, arrow keys, `0` to reset) on the focusable map viewport. Existing province arrow navigation, Home/End, Enter/Space, and Escape behavior MUST remain unchanged; viewport shortcuts apply only when the SVG viewport itself has focus.
- Keep the tooltip anchored correctly when the viewport changes, and keep province components from re-rendering merely because the viewport transform changed.
- Update Jest + @testing-library tests (ref API, gesture thresholds, clamping, controlled/uncontrolled, keyboard, controls, SSR), the TypeScript consumer smoke test, the readme API table, and the docs.

**Explicitly out of scope:** rotation and 3D tilt; animated/eased zoom transitions; inertia or momentum panning; minimaps; custom control rendering or control placement APIs; focus outlines drawn around a province after `focusCity`; zoom/pan persistence; URL or storage sync; region/choropleth overlays; changing the existing province keyboard navigation model; changing selection, disabled-city, or tooltip semantics beyond suppressing activation after a drag; and any breaking change to container markup, DOM ids, or default rendering.

## Capabilities

### New Capabilities

- `map-viewport`: opt-in zoom and pan interaction, viewport normalization and clamping, controlled/uncontrolled viewport state, accessible zoom controls, keyboard zoom/pan shortcuts, and the imperative `TurkeyMapRef` API.

### Modified Capabilities

- `accessibility`: the map may expose one additional opt-in tab stop and keyboard shortcuts when `zoomable` is enabled, plus accessible names, roles, and states for the zoom controls, without changing existing province navigation.
- `province-rendering`: viewport transform changes must not re-render provinces whose data, selection, disabled state, focus, and style are unchanged.
- `tooltip`: a visible city-anchored tooltip must reposition when the viewport changes so it stays attached to its province.

## Impact

- **Public API:** new optional props `zoomable`, `minZoom`, `maxZoom`, `zoomControls`, `viewport`, and `onViewportChange`; new `Viewport` and `TurkeyMapRef` types exported from both `turkey-map-react` and `turkey-map-react/core`; the default export becomes a `forwardRef` component while remaining assignable to the existing component usage.
- **Code:** `src/core.tsx` for viewport state, refs, gesture handlers, transform, controls, and click suppression; `src/index.tsx` for the `forwardRef` wrapper; `src/types.ts` for the new public types; a small internal viewport/geometry helper to keep math and clamping testable; new and updated tests under `src/__tests__/`.
- **Docs/tooling:** `readme.md` API table, a new `docs/zoom-pan.md` guide, `docs/api.md`, `docs/accessibility.md`, `docs/tooltips.md`, and the `scripts/test-types.js` consumer smoke test.
- **Dependencies:** none added. Zero runtime dependencies, React/React DOM >=16.8 peer dependencies, and server-side rendering remain intact. The core entry must stay under its 15 KiB gzip budget.
- **Compatibility:** opt-in only. With `zoomable` omitted, the rendered DOM, event behavior, tab order, callbacks, and snapshots are unchanged.
