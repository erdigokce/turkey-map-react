## Context

See `proposal.md` for motivation and `specs/tooltip/spec.md` for the behavior contract.

The tooltip is currently a private component (`src/Tooltip.tsx`) rendered inside `#svg-turkiye-haritasi-container`. `src/index.tsx` keeps a single `tooltipStyle` state (`left`, `top`, `visibility`, `animation`) and mutates it from `onMouseEnter`, `onMouseMove`, and `onMouseLeave` on each city `<g>`. The tooltip text is derived from `hoveredCityId`, with `tooltipText` and `disabledTooltipText` fallbacks. `hoveredCityId` also drives the hover fill and is set by mouse events only; `onHover` is emitted from a separate `onMouseOver` handler. City groups are `<g id={city.id} data-plakakodu data-iladi>` containing one `<path>`, and they become keyboard focusable (`tabIndex={0}`) only in selection modes.

Constraints that shape the approach:

- React and React DOM are peer dependencies at `>=16.8`, so no concurrent-only or React 18-only APIs.
- The package has zero runtime dependencies; `react-dom` is already a peer and can provide `createPortal`.
- The default rendering and legacy DOM id must not change, and the existing snapshot should only change if additive markup appears in default output.
- Jest coverage thresholds are 100% statements/functions/lines and 95% branches, so timer, capability, and media-query branches must all be tested.
- The current published entry bundle is dominated by the embedded province dataset (roughly 86 kB gzip in this workspace). The tooltip work must add no dependency and only a small amount of code; width should be evaluated as a delta, not against the data-dominated file size.

## Goals / Non-Goals

**Goals:**

- Make the tooltip a renderable surface with custom content while keeping the existing text tooltip byte-for-byte equivalent in default output.
- Drive tooltip lifecycle from Pointer Events with a capability-gated mouse fallback, covering mouse, touch, and pen.
- Keep tooltip state explicit and testable: active province, visibility, anchor, pending reveal, pending hide.
- Support portal rendering that survives `overflow: hidden` and behaves correctly during SSR, unmount, and `visible={false}`.
- Add reduced-motion and keyboard-focus behavior without adding tab stops in `"none"` mode.

**Non-Goals:**

- Viewport collision detection, flipping, or clamping. A portaled tooltip can still leave the viewport near edges.
- Scroll tracking while a tooltip is visible. City anchors are computed when the tooltip is shown or the active province changes, not on scroll or resize.
- Custom portal targets, tooltip theme tokens, `aria-describedby` wiring, and focus-trapped or interactive tooltip content.
- Populating the `value` argument of `renderTooltip` (reserved for a future data-value API).
- Changing `onHover` semantics for touch/pen or changing hover fill behavior.

## Decisions

### Keep hover fill and tooltip lifecycle separate but share the event boundary

`hoveredCityId` continues to drive the hover fill. The tooltip gets its own `tooltipCityId` state so it can retain the last province while fading out and so focus can own the tooltip without faking hover. Both are updated from the same pointer/mouse handlers on the city group.

Handlers are capability-gated per render:

```ts
const pointerEventsSupported = typeof window !== "undefined" && "PointerEvent" in window;
```

- Pointer handlers (`onPointerEnter`, `onPointerLeave`, `onPointerMove`, `onPointerCancel`) are always attached but early-return when `pointerEventsSupported` is false.
- Mouse handlers (`onMouseEnter`, `onMouseLeave`, `onMouseMove`) are always attached but early-return when `pointerEventsSupported` is true.
- `onMouseOver` remains the `onHover` path, so the public hover callback contract does not change.

This preserves the current jsdom tests (jsdom has no `PointerEvent`, so mouse fallback is exercised) while real browsers use pointer events. Pointer tests stub `window.PointerEvent` before rendering. Because exactly one handler family is active at a time, compatibility mouse events fired alongside pointer events cannot double-process an interaction.

Alternative considered: attach only pointer handlers and update all tests to pointer events. Rejected because older environments without `PointerEvent` would lose the tooltip entirely, contrary to the "mouse fallback" requirement.

### Model tooltip state as an explicit state machine with refs

State:

- `tooltipCityId: string | undefined` — last province the tooltip described.
- `tooltipVisible: boolean` — logical visibility for `aria-hidden`.
- `tooltipStyle` — `left`, `top`, optional `transform`, `visibility`, `animation`, and `position` (`absolute` inline, `fixed` portal).
- `revealTimerRef`, `hideTimerRef` — pending timers.
- `lastAnchorRef` — most recent cursor anchor for returning from focus.
- `cityElementsRef` — map of city id to `<g>` element for re-anchoring to the focused province.

Flows:

- **Enter a province:** set `hoveredCityId` and `tooltipCityId`, clear the hide timer. If already visible, cancel the animation and update the anchor immediately. Otherwise compute the anchor and schedule the reveal after `tooltipDelay`.
- **Leave a province:** clear `hoveredCityId`; if a city still has keyboard focus, re-anchor to that province and stay visible; otherwise schedule the hide after `tooltipDelay`. Hiding clears `tooltipVisible` and either applies the fade animation or hides immediately under reduced motion. `tooltipCityId` is intentionally not cleared so the last content remains during the fade and the hidden DOM does not churn.
- **Move within a province:** update the anchor only in `"cursor"` mode.
- **Cancel:** treat as leave.
- **Focus a province:** clear both timers, set `tooltipCityId` and visibility immediately, and anchor to the city regardless of `tooltipPosition`.
- **Blur a province:** if another province is hovered, re-anchor to the cursor and stay visible; otherwise schedule the hide.
- **Unmount:** clear both timers.
- **`showTooltip` becomes false or `visible` becomes false:** clear timers, hide, and suppress the portal.

Using `tooltipDelay` as both the reveal delay and the leave grace is deliberate: one "hover intent window" prevents both a flash on first entry and flicker between adjacent provinces. The trade-off is that the default tooltip now stays visible for up to 80 ms after the pointer leaves before fading. Existing tests that asserted an immediate fade must advance timers; `tooltipDelay={0}` restores immediate hiding.

Alternative considered: keep immediate hide on leave and only delay the reveal. Rejected because moving from A to B would hide A immediately and leave the tooltip blank for the reveal delay, which is the flicker the issue asks to remove.

### Anchor model: page coordinates inline, viewport coordinates in the portal

`tooltipOffset` is normalized once:

```ts
const offset = Number.isFinite(tooltipOffset) ? Math.max(0, tooltipOffset) : 16;
const delay = Number.isFinite(tooltipDelay) ? Math.max(0, tooltipDelay) : 80;
```

Cursor anchoring preserves the current placement:

```
left = pointerX + offset
top  = pointerY - 2 * offset
```

Inline mode uses `pageX` / `pageY` and keeps `position: absolute`, exactly matching today's default (`+16` / `-32`). Portal mode uses `clientX` / `clientY` and `position: fixed`, so scrolling and transformed ancestors cannot detach the tooltip from the pointer.

City anchoring uses the province group's `getBoundingClientRect()`:

```
left = rect.left + rect.width / 2 + (portal ? 0 : scrollX)
top  = rect.top + (portal ? 0 : scrollY) - offset
transform = "translate(-50%, -100%)"
```

`translate(-50%, -100%)` centers the tooltip and places its bottom edge `offset` pixels above the province. No `transform` is used in cursor mode, so existing cursor positioning and tests are unaffected.

Alternative considered: use `pageX`/`pageY` plus `position: absolute` for both modes and portal only to `body`. Rejected because a positioned `body` or a transformed ancestor changes the containing block, and absolute positioning would not reliably escape clipping.

### Portal only after mount; keep the legacy element shape

`Tooltip` is rendered inline on the server and on the first client render, then moved to `document.body` with `createPortal` once an effect sets a `mounted` flag. This avoids hydration mismatches and any `document` access during render.

- Portal target is always `document.body`; no selector or element prop.
- The same `Tooltip` element is used in both modes, so the id, role, aria state, content, and styles are identical.
- The portal is removed by React on unmount and when `tooltipPortal` or `showTooltip` becomes false.
- `visible={false}` suppresses the tooltip entirely, because a portaled tooltip would otherwise stay visible when the map container is hidden.
- `zIndex` stays `1` for compatibility; consumers can override it through the legacy CSS id if their app uses a higher stacking context.

Alternative considered: render nothing during SSR when `tooltipPortal` is true. Rejected because the existing SSR test and static-markup contract expect the tooltip markup when `showTooltip` is true.

### Tooltip component becomes a presentational shell

`src/Tooltip.tsx` keeps the existing default styles (`width: 120`, black background, white text, centered, 5px vertical padding, 6px radius, absolute, `zIndex: 1`) and adds:

- `role="tooltip"`.
- `aria-hidden={visible ? undefined : true}`.
- `pointerEvents: "none"`.
- Optional `children`, rendered when provided; `text` remains a fallback for the existing internal tests and text mode.
- `position` and `transform` passed through the `style` prop.
- When `renderTooltip` is active, the call site adds `width: "auto"`, `maxWidth: 320`, and normal white-space so custom content can size itself; the default text tooltip keeps `width: 120`.

The component is internal (not exported from the entry point), so its prop shape is not part of the public API.

### Content precedence and disabled compatibility

The tooltip content resolution is:

```
if renderTooltip and city: renderTooltip(city, undefined)
else if disabled city: disabledTooltipText ?? tooltipText ?? city.name
else: tooltipText || city.name
```

`renderTooltip` receives the same `CityType` object from `data` and a second argument that is always `undefined`. The type is `(city: CityType, value?: unknown) => React.ReactNode`, so both one- and two-argument renderers type-check. `null` and `false` render an empty container rather than falling back to text.

Disabled provinces still drive the tooltip; the existing disabled change already keeps hover tooltip discovery while suppressing `onHover`, and this design preserves that by not gating pointer handlers on disabled state. This change does not modify disabled styling or activation.

Alternative considered: only call `renderTooltip` for enabled provinces. Rejected because consumers need custom unavailable-state content and because it would make the tooltip unexpectedly inconsistent.

### Reduced motion hook

A small internal hook owns the media query:

```ts
const [reducedMotion, setReducedMotion] = useState(() => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
});
```

An effect subscribes with `addEventListener("change")` and falls back to the legacy `addListener` for older browsers, removing the listener on cleanup. Missing `matchMedia` (SSR, jsdom by default) means non-animated behavior, as required. The keyframe `<style>` block stays rendered whenever `showTooltip` is true to keep SSR output and the existing test stable; reduced motion only suppresses the `animation` field applied to the tooltip.

### Public types

```ts
export type TooltipPosition = "cursor" | "city";
export type RenderTooltipCallback = (city: CityType, value?: unknown) => React.ReactNode;
```

New optional props on `IProps`: `renderTooltip`, `tooltipPosition`, `tooltipPortal`, `tooltipOffset`, `tooltipDelay`. No existing prop changes type or default.

### Test strategy

- Keep existing default/no-tooltip rendering tests and the snapshot unchanged.
- Stub `window.PointerEvent` for pointer suites and restore it for mouse-fallback suites; use `fireEvent.pointerEnter/Move/Leave/Cancel` and `pointerType: "touch" | "pen"`.
- Use Jest fake timers for reveal, cancellation, hide grace, and unmount cleanup.
- Mock `window.matchMedia` for both motion preferences and exercise the runtime `change` listener.
- Mock `getBoundingClientRect` on a city group for city anchoring.
- Assert portal presence with `document.body.querySelector("#svg-turkiye-haritasi-container-tooltip")`, toggling, unmount cleanup, and `visible={false}`.
- Extend `scripts/test-types.js` with one- and two-argument renderers, `TooltipPosition`, and all new props; extend the built-bundle artifact test with a custom tooltip and a portal case.

## Risks / Trade-offs

- **The default hide now has an 80 ms grace period** → intentional hover intent; document it, and let consumers set `tooltipDelay={0}` for the old immediate behavior.
- **Capability gating depends on `window.PointerEvent` at render time** → SSR renders no pointer-specific behavior; handlers are re-evaluated on every render, so client mounts pick the right family. Tests cover both.
- **City anchoring is not updated on scroll or resize** → portal mode is designed for pointer use; document the limitation and keep collision/scroll tracking out of scope.
- **Portal tooltip can leave the viewport near edges** → no collision detection in this change; consumers can use CSS on the legacy id to adjust.
- **`position: fixed` changes positioning coordinate space in portal mode** → inline mode keeps `absolute` with page coordinates, so existing consumers and tests are unaffected; the two modes are tested separately.
- **Keeping the keyframes when reduced motion is on** → the definition is inert and preserves SSR output; only the animation application is suppressed.
- **Custom content can overflow the fixed text width** → custom mode uses auto width and a `maxWidth`; default text mode keeps 120 px.
- **Focus-triggered tooltips are new behavior in selection modes** → only active when `showTooltip` is true, and cities are already focusable in selection modes; no tab stops are added in `"none"` mode.
- **Timer-driven state can update after unmount** → both timer refs are cleared in a mount-lifetime cleanup, and tests assert no post-unmount updates.
- **Bundle size is dominated by the dataset** → no dependency is added and only pointer/tooltip state code grows; verify the artifact build and report the delta rather than the absolute size.

## Migration Plan

No consumer migration. The release is additive and can ship as a minor version. Rollback consists of removing the new props, restoring the mouse-only tooltip handlers, and deleting the reduced-motion hook and portal branch; there is no persisted state or schema change.

## Open Questions

None.
