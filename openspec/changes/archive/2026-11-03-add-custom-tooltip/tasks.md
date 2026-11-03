## 1. Public API and types

- [x] 1.1 Export `TooltipPosition = "cursor" | "city"` and `RenderTooltipCallback = (city: CityType, value?: unknown) => React.ReactNode` from `src/index.tsx`, matching the existing exported-type style
- [x] 1.2 Add optional `renderTooltip`, `tooltipPosition`, `tooltipPortal`, `tooltipOffset`, and `tooltipDelay` to `IProps` with defaults `undefined`, `"cursor"`, `false`, `16`, and `80`; leave every existing prop and default untouched
- [x] 1.3 Add normalization helpers that map non-finite offsets/delays to their defaults and clamp negative values to `0`

## 2. Tooltip shell and reduced motion

- [x] 2.1 Extend `src/Tooltip.tsx` to accept `children` (preferred) and keep `text` as a fallback, render `role="tooltip"`, set `aria-hidden="true"` only while hidden, and apply `pointer-events: none`
- [x] 2.2 Pass `position`, `transform`, `width`, and `maxWidth` through the existing style merge so inline/portal and text/custom modes can differ without changing the default text tooltip styles
- [x] 2.3 Add an internal `usePrefersReducedMotion` hook that defaults to reduced/non-animated when `window.matchMedia` is unavailable, subscribes with `addEventListener("change")`, falls back to `addListener`, and removes the listener on unmount
- [x] 2.4 Keep the `turkey_react_map_tooltip_fade_out` keyframes rendered when `showTooltip` is true, and suppress only the tooltip's `animation` style when reduced motion is active

## 3. Tooltip interaction state and anchoring

- [x] 3.1 Separate tooltip ownership (`tooltipCityId`, `tooltipVisible`) from `hoveredCityId` so hover fill, fade-out content, and focus can coexist without fake hover state
- [x] 3.2 Replace the mouse-only tooltip handlers with capability-gated pointer handlers (`pointerenter`, `pointerleave`, `pointermove`, `pointercancel`) plus mouse fallback handlers that early-return when `PointerEvent` is supported; keep `onMouseOver` as the only `onHover` path
- [x] 3.3 Implement the reveal timer, leave/hide grace timer, and immediate update between adjacent provinces using `tooltipDelay`; clear both timers on unmount and when `showTooltip` becomes false
- [x] 3.4 Implement cursor anchoring with `pageX`/`pageY` plus `position: absolute` inline, and `clientX`/`clientY` plus `position: fixed` in portal mode, preserving the default `+offset` / `-2 * offset` displacement
- [x] 3.5 Implement `"city"` anchoring from the province group's `getBoundingClientRect()` with page-coordinate conversion inline and `translate(-50%, -100%)`; keep focus re-anchoring working without the pointer
- [x] 3.6 Resolve tooltip content as `renderTooltip(city, undefined)` first, then the disabled text fallback (`disabledTooltipText ?? tooltipText ?? name`), then `tooltipText || name`; render empty content for `null`/`false` without throwing
- [x] 3.7 Add the custom-content shell styles (`width: "auto"`, `maxWidth: 320`, normal white-space) only when `renderTooltip` is active, leaving the built-in text tooltip at `width: 120`
- [x] 3.8 Ensure the tooltip, including portal mode, never receives pointer events and never changes `onHover`, `onClick`, or selection callbacks; keep disabled-province tooltip discovery intact

## 4. Portal rendering

- [x] 4.1 Add a mount flag and render the tooltip inline on the server and first client render, then move the same element into `document.body` with `createPortal` from `react-dom`
- [x] 4.2 Handle `tooltipPortal` toggling, unmount cleanup, and `showTooltip`/`visible` becoming false so no tooltip remains in `document.body` when it should be hidden
- [x] 4.3 Keep the legacy id `#svg-turkiye-haritasi-container-tooltip` in both inline and portal modes and avoid any `document` access during render or server rendering

## 5. Focus and accessibility

- [x] 5.1 Show the tooltip immediately when a province receives keyboard focus while `showTooltip` is true, anchored to the province regardless of `tooltipPosition`
- [x] 5.2 On blur, keep the tooltip for a hovered province or schedule a hide when nothing else is active; do not add tab stops in `selectionMode="none"`
- [x] 5.3 Reflect visibility through `aria-hidden` and assert the tooltip shell itself is not focusable and adds no tab stop

## 6. Tests

- [x] 6.1 Update `src/__tests__/Tooltip.test.tsx` for `children`/`text`, `role="tooltip"`, `aria-hidden`, `pointer-events: none`, style merging, and the unchanged default styles
- [x] 6.2 Update `src/__tests__/TurkeyMap.tooltip.test.tsx` for the pointer capability gate, reveal/hide timers, retained content during fade, and the existing text/precedence behavior; use fake timers and keep a mouse-fallback path
- [x] 6.3 Add pointer interaction tests for mouse, touch, and pen `pointerType`, `pointermove` tracking, `pointerleave`, `pointercancel`, and proof that compatibility mouse events do not double-process when `PointerEvent` is stubbed
- [x] 6.4 Add mouse-fallback tests with `window.PointerEvent` removed for enter, move, leave, and cancel behavior
- [x] 6.5 Add `renderTooltip` tests for custom elements, precedence over `tooltipText`/`disabledTooltipText`, disabled provinces, the full `CityType` payload, the `undefined` second argument, and `null`/empty output
- [x] 6.6 Add positioning tests for default cursor placement, custom `tooltipOffset`, `tooltipPosition="city"` bounds/centering, province-to-province updates, and invalid/negative offset handling
- [x] 6.7 Add hover-intent tests for delayed reveal, cancellation on early leave, no delay restart between adjacent provinces, empty-gap grace, `tooltipDelay={0}`, invalid/negative delay, and unmount timer cleanup
- [x] 6.8 Add portal tests for `document.body` placement inside an `overflow: hidden` container, legacy id lookup, toggling on/off, unmount removal, `visible={false}` suppression, and SSR without `document`
- [x] 6.9 Add reduced-motion tests for immediate hide, fade when motion is allowed, a runtime media-query change, and missing `matchMedia`
- [x] 6.10 Add focus/accessibility tests for focus reveal, province anchoring, blur hide, return-to-hover behaviour, `role`, `aria-hidden` transitions, and no new tab stops in `"none"` mode
- [x] 6.11 Extend `tests/artifact/bundle.test.tsx` with a built-bundle custom tooltip render and a portal case
- [x] 6.12 Confirm the default rendering snapshot is unchanged and update `TurkeyMap.ssr.test.tsx` only for additive tooltip markup if required
- [x] 6.13 Run `npm test` and `npm run test:coverage` and close any uncovered timer, capability, media-query, or portal branch

## 7. Documentation and verification

- [x] 7.1 Add `TooltipPosition` and `RenderTooltipCallback` to the readme types table and add rows for `renderTooltip`, `tooltipPosition`, `tooltipPortal`, `tooltipOffset`, and `tooltipDelay` to the props table with `2.2.0` as the Since value
- [x] 7.2 Add readme examples for custom tooltip content, cursor vs city positioning, portal usage with clipping containers, offset/delay tuning, reduced-motion behaviour, and keyboard-focus tooltips; document that `renderTooltip`'s `value` is reserved and that custom content must not rely on pointer interaction
- [x] 7.3 Document that `tooltipDelay` also acts as the leave grace period, that `tooltipDelay={0}` restores immediate hiding, that city anchoring is not updated on scroll/resize, and that no collision detection is included
- [x] 7.4 Extend `scripts/test-types.js` with `TooltipPosition`, `RenderTooltipCallback`, all new props, and one- and two-argument `renderTooltip` usages
- [x] 7.5 Run `npm run clean-build`, `npm run test:coverage`, `npm run test:artifact`, `npm run test:types`, `npm run test:package`, and `npm run test:compat`; report the built entry size delta and confirm no runtime dependency was added
