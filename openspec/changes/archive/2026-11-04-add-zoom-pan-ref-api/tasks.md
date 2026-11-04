## 1. Public types and viewport math

- [x] 1.1 Add `Viewport`, `TurkeyMapRef`, and the new optional props (`zoomable`, `minZoom`, `maxZoom`, `zoomControls`, `viewport`, `onViewportChange`) to `src/types.ts`, and re-export the new types from `src/core.tsx`, `src/index.tsx`, and the root/core entry points.
- [x] 1.2 Create `src/viewport.ts` with pure helpers for zoom-bound normalization, viewport clamping, pointer-anchored zoom, panning, centering, and client-to-viewBox conversion, using the `translate(tx ty) scale(s)` model from `design.md`.
- [x] 1.3 Add focused unit tests for `src/viewport.ts` covering min/max normalization, clamp ranges at and above `minZoom`, pointer-anchored zoom, centering, pan limits, and non-finite inputs.
- [x] 1.4 Extend `scripts/test-types.js` with `Viewport`, `TurkeyMapRef`, a typed ref, the new props, and `focusCity`/`zoomTo`/`resetView` usage on both the root and core entries.

## 2. Viewport state and imperative ref

- [x] 2.1 Convert `CoreTurkeyMap` to `forwardRef<TurkeyMapRef, CoreProps>` and wrap the default export in `src/index.tsx` with `forwardRef` so refs reach the core component while dataset injection is unchanged.
- [x] 2.2 Implement the controlled/uncontrolled viewport state model with normalized effective values, no-op change detection, mount-time silence, and `onViewportChange` emission only for gestures and imperative calls.
- [x] 2.3 Add development warnings for `viewport`, `onViewportChange`, `minZoom`, `maxZoom`, and `zoomControls` when `zoomable` is omitted, and for invalid zoom bounds.
- [x] 2.4 Implement the stable `useImperativeHandle` API: `focusCity(cityId, zoom?)` using the city group's `getBBox()` with guards and warnings, `zoomTo(scale)` around the current center, and `resetView()`.
- [x] 2.5 Apply the normalized transform to the existing province group in `src/core.tsx` only when `zoomable` is enabled, keeping the province group id, role, aria attributes, and province markup unchanged.
- [x] 2.6 Add tests for the ref API in controlled and uncontrolled modes, unknown and disabled cities, clamping, reset behavior, and safe calls before mount or without layout APIs.
- [x] 2.7 Add render-count tests proving wheel, drag, and ref viewport changes do not re-render `Province` components and do not disturb selection, disabled, hover, or focus state.
- [x] 2.8 Refresh a visible city-anchored tooltip after viewport changes without restarting the reveal delay, and add tests for zoom, pan, cursor mode, and hidden tooltips.

## 3. Gestures and click suppression

- [x] 3.1 Attach a non-passive native wheel listener to the SVG when `zoomable`, normalize `deltaMode`, zoom around the pointer, call `preventDefault`, and clean up on disable/unmount.
- [x] 3.2 Implement pointer tracking for primary-pointer drag panning and two-pointer pinch zoom, including guarded pointer capture, clamping, and `touch-action: none` on the zoomable SVG.
- [x] 3.3 Implement double-click zoom-in around the pointer and ignore secondary mouse buttons for drag gestures.
- [x] 3.4 Implement the 4 px mouse/pen and 8 px touch drag threshold, suppress `onClick` and selection activation for the terminating drag click only, and reset suppression for the next tap.
- [x] 3.5 Add gesture tests for wheel, pinch, double-click, drag panning, secondary-button rejection, edge clamping, below-threshold taps, above-threshold drags, drags ending outside a province, and the next-tap recovery case.

## 4. Zoom controls and keyboard access

- [x] 4.1 Render the optional zoom-control group with accessible zoom-in, zoom-out, and reset buttons, bound-aware disabled states, stable class names, and container layout styles; keep the controls inert without `zoomable`.
- [x] 4.2 Make the SVG viewport an opt-in tab stop with an accessible name that describes the zoom/pan keys, and compose consumer `svgProps` handlers instead of replacing them.
- [x] 4.3 Implement viewport keyboard shortcuts (`+`/`=`, `-`/`_`, arrows, `0`) that run only when the SVG itself has focus and never override province navigation or zoom-control activation.
- [x] 4.4 Add accessibility tests for the viewport label/tab stop, control names and disabled states, keyboard operation, preserved province arrow/Home/End/Enter/Space/Escape behavior, preserved live-region announcements, and disabled-province inertness.
- [x] 4.5 Add SSR tests for zoomable maps with controls, including the initial transform, control markup, no `window`/`document` access, and safe rendering when `PointerEvent`/layout APIs are absent.

## 5. Documentation and release verification

- [x] 5.1 Add `docs/zoom-pan.md` covering the new props, `Viewport` shape and units, controlled/uncontrolled examples, the ref API, gestures, keyboard shortcuts, controls, wheel/touch trade-offs, and the v3.0 no-migration note.
- [x] 5.2 Update `readme.md` API/feature tables and entry-point size text, `docs/api.md` prop/type tables, `docs/accessibility.md` for the viewport tab stop and controls, and `docs/tooltips.md` for viewport-following city anchors.
- [x] 5.3 Update or add snapshots only for additive zoom markup, and confirm default snapshots are byte-for-byte unchanged when `zoomable` is omitted.
- [x] 5.4 Run `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run clean-build`, `npm run test:bundle-size`, `npm run test:artifact`, `npm run test:package`, and `npm run test:types`, fixing any coverage or budget regressions.
