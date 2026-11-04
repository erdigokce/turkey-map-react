# map-viewport Specification

## Purpose

Lets consumers zoom and pan the province map by pointer, touch, keyboard, built-in controls, or an imperative ref, while keeping the viewport state controllable, bounded, and fully opt-in.

## Requirements

### Requirement: Zoom and pan are opt-in and backward compatible

The component SHALL accept `zoomable?: boolean` with a default of `false`. When `zoomable` is omitted or `false`, the component MUST NOT apply a viewport transform, attach zoom/pan gestures, add keyboard shortcuts, render zoom controls, or add a viewport tab stop. The existing rendered DOM, legacy ids, `data-*` attributes, callbacks, selection behavior, disabled behavior, tooltip behavior, and default appearance MUST remain unchanged.

When `zoomable` is `true`, the component MUST render the same container, SVG, and province element structure and ids as before, applying zoom and pan without introducing a breaking container markup change.

#### Scenario: Default map is unchanged

- **WHEN** `<TurkeyMap />` is rendered without `zoomable`
- **THEN** no viewport transform, zoom controls, extra tab stop, or gesture handler is rendered, and existing behavior is unchanged

#### Scenario: Zoom is explicitly enabled

- **WHEN** `zoomable` is `true`
- **THEN** the map accepts zoom and pan input and exposes the viewport state described by this capability

#### Scenario: Existing ids and province markup survive

- **WHEN** a zoomable map renders
- **THEN** the legacy container, SVG, tooltip, province group, and city ids are still present and each province still exposes its existing `data-*` attributes

### Requirement: Viewport state has a public, normalized shape

The component SHALL expose a public `Viewport` value with `scale`, `translateX`, and `translateY` fields. `scale` MUST be a finite number within `[minZoom, maxZoom]`. `translateX` and `translateY` MUST be finite offsets expressed in SVG viewBox user units and applied after scaling; they MUST be normalized so the rendered map stays within its bounds.

`minZoom` SHALL default to `1` and `maxZoom` SHALL default to `8`. A non-finite or out-of-range `minZoom` MUST fall back to `1` with a development warning. A non-finite `maxZoom`, or a `maxZoom` lower than the effective `minZoom`, MUST be normalized to a valid value no lower than `minZoom`, with a development warning. An uncontrolled zoomable map MUST start at `scale = minZoom` with the map centered.

#### Scenario: Defaults define the initial viewport

- **WHEN** `zoomable` is `true` and no zoom bounds or viewport are supplied
- **THEN** the initial viewport is the minimum zoom (`1`) with the map centered

#### Scenario: Custom bounds are respected

- **WHEN** `minZoom={2}` and `maxZoom={5}` are supplied
- **THEN** the viewport scale is always within `2` through `5`

#### Scenario: Invalid minimum zoom falls back

- **WHEN** `minZoom` is `NaN`, `Infinity`, `0`, or negative
- **THEN** the map uses `1` as the minimum zoom and emits a development warning

#### Scenario: Maximum below minimum is repaired

- **WHEN** `minZoom={4}` and `maxZoom={2}` are supplied
- **THEN** the effective maximum zoom is no lower than `4` and a development warning is emitted

### Requirement: Pointer, wheel, double-click, and pinch input

When `zoomable` is `true`, the component SHALL support:

- wheel input to zoom in or out around the pointer position;
- double-click to zoom in around the pointer position;
- two-pointer pinch to zoom around the midpoint between the pointers;
- primary-pointer drag to pan the map.

Each interaction MUST update the viewport continuously for drag and pinch, and MUST clamp the result with the zoom bounds and pan bounds. Interactions MUST NOT start from a secondary mouse button. When multiple interactions overlap, the component MUST keep the viewport valid and MUST NOT emit non-finite values.

#### Scenario: Wheel zooms

- **WHEN** the pointer is over the map and the user scrolls the wheel up or down
- **THEN** the viewport zooms in or out around the pointer position, within the configured bounds

#### Scenario: Double-click zooms in

- **WHEN** the user double-clicks a point on a zoomable map that is below the maximum zoom
- **THEN** the map zooms in around that point

#### Scenario: Pinch zooms

- **WHEN** two touch pointers move apart or together over the map
- **THEN** the viewport zooms around the midpoint between the pointers

#### Scenario: Drag pans

- **WHEN** the user presses the primary pointer and moves it across the map while zoomed in
- **THEN** the map moves with the pointer until the pan is clamped at the map bounds

#### Scenario: Secondary mouse button does not start a gesture

- **WHEN** the user presses the secondary mouse button and drags
- **THEN** the viewport does not pan and no click suppression is applied

### Requirement: Drag threshold suppresses click activation

The component SHALL distinguish a tap from a drag using a small movement threshold: `4` CSS pixels for mouse and pen pointers, and `8` CSS pixels for touch pointers. Movement at or below the threshold MUST leave `onClick` and selection activation unchanged. Movement above the threshold MUST suppress `onClick` and selection activation for the click synthesized at the end of that gesture. Suppression MUST apply only to that gesture; the next tap or keyboard activation MUST behave normally. `onHover`, tooltip behavior, and focus behavior MUST NOT be suppressed.

#### Scenario: A tap still clicks

- **WHEN** the user presses and releases a province without moving beyond the threshold
- **THEN** `onClick` fires once and selection activation behaves as before

#### Scenario: A drag does not click

- **WHEN** the user presses a province, drags beyond the threshold, and releases over a province
- **THEN** the viewport pans, `onClick` does not fire, and selection does not change

#### Scenario: A drag ending outside a province does not click

- **WHEN** the drag starts on a province and ends over empty map area or outside the map
- **THEN** no `onClick` or selection activation fires

#### Scenario: The next tap works

- **WHEN** a drag finishes and the user then taps a province
- **THEN** the tap fires `onClick` and selection normally

#### Scenario: Keyboard activation is unaffected

- **WHEN** a province has keyboard focus and the user presses Enter or Space
- **THEN** activation behaves exactly as before, regardless of any earlier drag

### Requirement: Pan and zoom are clamped to the map bounds

The component SHALL clamp the viewport after every user gesture, imperative call, controlled-value change, and viewBox change. At the minimum zoom the map MUST be centered and MUST NOT be pannable. Above the minimum zoom, the rendered map MUST continue to cover the viewport so no empty space appears at the edges, and translation MUST be limited to the range that keeps the scaled content aligned with the viewBox. A controlled viewport that violates these constraints MUST be normalized before rendering and MUST emit only normalized values through `onViewportChange`.

#### Scenario: Panning at minimum zoom does nothing

- **WHEN** the viewport is at `minZoom` and the user drags
- **THEN** the viewport translation stays centered

#### Scenario: Panning stops at an edge

- **WHEN** the user drags beyond the left, right, top, or bottom map bound while zoomed in
- **THEN** the translation clamps at that bound and the map does not expose empty space

#### Scenario: Zooming out recenters the map

- **WHEN** the user zooms out to the minimum zoom after panning
- **THEN** the map returns to the centered position

#### Scenario: Invalid controlled translation is normalized

- **WHEN** a controlled `viewport` supplies `NaN`, `Infinity`, or translations outside the allowed range
- **THEN** the rendered viewport uses finite, clamped values and does not throw

### Requirement: Controlled and uncontrolled viewport modes

The component SHALL accept `viewport?: Viewport` for controlled mode and `onViewportChange?: (viewport: Viewport) => void`. When `viewport` is supplied, the rendered viewport MUST follow the supplied value, normalized for bounds, and internal user gestures MUST NOT replace it without the parent updating the prop. When `viewport` is omitted, the component MUST manage viewport state internally and update it on gestures and imperative calls.

`onViewportChange` MUST fire whenever the effective viewport changes because of a user gesture or an imperative ref call. It MUST NOT fire merely because the component mounted, because a controlled prop was supplied, or because a parent re-rendered without changing the viewport. Supplying `viewport`, `onViewportChange`, `minZoom`, `maxZoom`, or `zoomControls` without `zoomable` MUST have no effect and MUST emit a development warning.

#### Scenario: Uncontrolled viewport updates itself

- **WHEN** no `viewport` prop is supplied and the user zooms or pans
- **THEN** the map updates its own viewport and reports the change through `onViewportChange`

#### Scenario: Controlled viewport follows the parent

- **WHEN** `viewport={{ scale: 3, translateX: 0, translateY: 0 }}` is supplied
- **THEN** the map renders at scale `3` and further internal gestures do not change the rendered scale until the parent supplies a new value

#### Scenario: Controlled gestures report the requested value

- **WHEN** the user pans a controlled map
- **THEN** `onViewportChange` receives the requested normalized viewport and the rendered viewport remains the supplied controlled value

#### Scenario: Mount does not emit a change

- **WHEN** a zoomable map mounts with or without a controlled viewport
- **THEN** `onViewportChange` is not called during mount

#### Scenario: Zoom props without zoomable are inert

- **WHEN** `viewport`, `onViewportChange`, `minZoom`, `maxZoom`, or `zoomControls` is supplied while `zoomable` is `false` or omitted
- **THEN** no zoom behavior is added, a development warning explains that `zoomable` is required, and default rendering is unchanged

### Requirement: Imperative ref API

The component SHALL expose a public `TurkeyMapRef` with the methods `focusCity(cityId: string, zoom?: number)`, `zoomTo(scale: number)`, and `resetView()`. The ref MUST be reachable through the default export of both `turkey-map-react` and `turkey-map-react/core`.

- `focusCity` MUST center the named province's rendered bounds in the map viewport. When `zoom` is omitted, the target scale MUST be the greater of the current scale and `2`, clamped to `[minZoom, maxZoom]`. When `zoom` is supplied, it MUST be treated as an absolute scale and clamped.
- `zoomTo` MUST set an absolute scale around the current viewport center, clamped to `[minZoom, maxZoom]`.
- `resetView` MUST return to `minZoom` with the map centered.
- An unknown city id MUST be ignored with a development warning.
- A disabled city MUST still be focusable; focusing is not selection.
- Each method MUST update an uncontrolled viewport and report the change through `onViewportChange`. In controlled mode each method MUST report the requested normalized viewport without rendering it unless the parent updates `viewport`.
- Each method MUST be safe to call when the map is not mounted, when the DOM is unavailable, or during server rendering; in those cases it MUST be a no-op rather than throwing.

#### Scenario: focusCity centers and zooms a province

- **WHEN** `ref.current.focusCity("istanbul")` is called at the minimum zoom
- **THEN** the viewport centers İstanbul and uses a clamped scale of `2`

#### Scenario: focusCity accepts an explicit zoom

- **WHEN** `ref.current.focusCity("ankara", 5)` is called
- **THEN** the viewport centers Ankara at scale `5` unless `maxZoom` is lower

#### Scenario: zoomTo sets an absolute scale

- **WHEN** the viewport is at scale `2` and `ref.current.zoomTo(6)` is called
- **THEN** the viewport uses scale `6` around its current center

#### Scenario: resetView restores the initial view

- **WHEN** the map is zoomed and panned and `ref.current.resetView()` is called
- **THEN** the viewport returns to `minZoom` and the centered position

#### Scenario: Unknown city is ignored

- **WHEN** `ref.current.focusCity("not-a-city")` is called
- **THEN** the viewport does not change and a development warning is emitted

#### Scenario: Disabled city can be focused

- **WHEN** `ref.current.focusCity("istanbul")` is called for a disabled province
- **THEN** the viewport centers that province without selecting or enabling it

#### Scenario: Imperative calls are controlled-aware

- **WHEN** `ref.current.zoomTo(3)` is called while `viewport` is controlled
- **THEN** `onViewportChange` receives the normalized scale `3` and the rendered viewport changes only after the parent supplies the new value

#### Scenario: Ref calls are safe before mount or without DOM

- **WHEN** a ref method is called on an unmounted map, or when no browser DOM is available
- **THEN** the call does not throw

### Requirement: Built-in accessible zoom controls

The component SHALL accept `zoomControls?: boolean` with a default of `false`. When `zoomable` and `zoomControls` are both `true`, the component MUST render a group containing zoom-in, zoom-out, and reset buttons. Each button MUST be a `type="button"` with an accessible name. Zoom-in and zoom-out MUST be disabled when the corresponding bound is reached. Reset MUST be disabled when the viewport is already at the reset position. The controls MUST be keyboard operable, MUST show the existing focus indicator behavior, and MUST NOT trigger province clicks, selection, or drag panning.

#### Scenario: Controls render when requested

- **WHEN** `zoomable` and `zoomControls` are `true`
- **THEN** zoom-in, zoom-out, and reset buttons are rendered with accessible names

#### Scenario: Controls are absent by default

- **WHEN** `zoomControls` is omitted or `false`
- **THEN** no zoom controls are rendered

#### Scenario: Controls are inert without zoomable

- **WHEN** `zoomControls` is `true` while `zoomable` is `false` or omitted
- **THEN** no controls are rendered and a development warning is emitted

#### Scenario: Controls respect zoom limits

- **WHEN** the viewport is at `maxZoom`
- **THEN** the zoom-in button is disabled

#### Scenario: Reset is disabled at the initial view

- **WHEN** the viewport is already at `minZoom` and centered
- **THEN** the reset button is disabled

#### Scenario: Controls do not activate the map

- **WHEN** the user clicks or activates a zoom control with the keyboard
- **THEN** the viewport changes and no `onClick` or selection callback fires

### Requirement: Keyboard viewport shortcuts

When `zoomable` is `true`, the SVG viewport SHALL be reachable with a single additional tab stop and MUST expose an accessible name that describes the map and its zoom/pan keys. While that viewport element itself has focus, `+` or `=` MUST zoom in, `-` MUST zoom out, the arrow keys MUST pan, and `0` MUST reset the view, all clamped to bounds. Handled keys MUST prevent the browser's default action.

These shortcuts MUST apply only when the viewport element itself has focus. Key presses that originate from a province or from a zoom control MUST NOT trigger viewport shortcuts, so the existing province arrow navigation, Home/End, Enter/Space, and Escape behavior remains unchanged. When `zoomable` is `false` or omitted, no viewport tab stop or shortcut MUST be added.

#### Scenario: Viewport is a tab stop

- **WHEN** a zoomable map renders and the user presses Tab before reaching the provinces
- **THEN** the SVG viewport receives focus and exposes its accessible name

#### Scenario: Plus and minus zoom

- **WHEN** the viewport element has focus and the user presses `+`, `=`, or `-`
- **THEN** the viewport zooms in or out around the current center, within the configured bounds

#### Scenario: Arrow keys pan

- **WHEN** the viewport element has focus and the user presses an arrow key
- **THEN** the viewport pans in that direction, clamped to the map bounds

#### Scenario: Zero resets

- **WHEN** the viewport element has focus and the user presses `0`
- **THEN** the viewport returns to `minZoom` and the centered position

#### Scenario: Province navigation is untouched

- **WHEN** a province has focus and the user presses an arrow key
- **THEN** focus moves between provinces exactly as before and the viewport does not pan

#### Scenario: No shortcut without zoom

- **WHEN** `zoomable` is omitted or `false`
- **THEN** the SVG viewport is not an extra tab stop and no zoom/pan keyboard shortcut is added

### Requirement: Server rendering, dependencies, and public types

The zoom and pan behavior MUST NOT add a runtime dependency. Module evaluation and server rendering MUST NOT access `window`, `document`, or browser-only layout APIs. A server-rendered zoomable map MUST produce valid markup for the initial viewport and controls without throwing. The `Viewport` and `TurkeyMapRef` types MUST be exported from both `turkey-map-react` and `turkey-map-react/core`, and the default export MUST remain usable as a React component with a typed `ref`. The implementation MUST remain compatible with React >=16.8.

#### Scenario: Server rendering is safe

- **WHEN** a zoomable map with controls is rendered to a string on a server
- **THEN** rendering does not throw and does not access `document` or `window`

#### Scenario: Public types are exported

- **WHEN** a TypeScript consumer imports `Viewport` and `TurkeyMapRef` from the root or core entry and types a ref
- **THEN** the import compiles and the ref exposes `focusCity`, `zoomTo`, and `resetView`

#### Scenario: No dependencies are added

- **WHEN** the package dependencies are inspected after the change
- **THEN** the package still has zero runtime dependencies and React/React DOM remain peer dependencies

#### Scenario: Core bundle stays within budget

- **WHEN** the package is built and the bundle-size check runs
- **THEN** the core entry remains within its 15 KiB gzip budget
