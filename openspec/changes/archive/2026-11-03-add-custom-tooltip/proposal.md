## Why

The built-in tooltip is text-only, driven by mouse-only events, and rendered inside the map container, so it is clipped by any ancestor with `overflow: hidden`. Consumers cannot render rich content (flags, values, actions) and touch/pen users get no tooltip at all. This change turns the tooltip into an opt-in, renderable surface without breaking the existing text tooltip.

## What Changes

This change is **additive and non-breaking**. `<TurkeyMap />`, `showTooltip`, `tooltipText`, the tooltip DOM id (`#svg-turkiye-haritasi-container-tooltip`), and all existing interaction props keep working exactly as today.

- Add `renderTooltip?: (city: CityType, value?: unknown) => React.ReactNode` so consumers can render arbitrary content. When supplied it takes precedence over the built-in text resolution. The reserved `value` argument is always `undefined` in this change; a future data-value API will populate it.
- Add `tooltipPosition?: "cursor" | "city"` (default `"cursor"`) to anchor the tooltip either at the pointer or at the hovered province.
- Add `tooltipPortal?: boolean` (default `false`) to render the tooltip into `document.body`, escaping clipping ancestors.
- Add `tooltipOffset?: number` (default `16`) for the distance between the anchor and the tooltip, and `tooltipDelay?: number` (default `80`) for hover intent so adjacent provinces do not flicker.
- Replace mouse-only tooltip handling with Pointer Events (`pointerenter`, `pointerleave`, `pointermove`, `pointercancel`) and keep a mouse-event fallback for environments without `PointerEvent`. Touch and pen produce the same tooltip lifecycle as mouse.
- Respect `prefers-reduced-motion`: the fade-out is skipped when the user asks for reduced motion, and the tooltip hides immediately. The media-query listener is cleaned up on unmount and is SSR-safe.
- Keep the tooltip non-interactive (`pointer-events: none`), expose `role="tooltip"` and an accurate hidden state, and preserve the legacy id in both inline and portal modes.
- Update Jest + @testing-library interaction tests (pointer, mouse fallback, touch/pen, delay, portal, reduced motion), the TypeScript consumer smoke test, and the readme API tables and examples.

**Explicitly out of scope:** choropleth/per-city value data and populating `renderTooltip`'s `value`; CSS variables, `className`/`style`/`svgProps`, and `getCityStyle` (#54); disabled-city behavior and `disabledTooltipText` (#53); roving tabindex, listbox/option roles, `aria-live`, and the accessibility audit (#56); the separate data entry point (#57); custom portal targets (selector or element), tooltip theme tokens, keyboard-triggered tooltips, and `aria-describedby` wiring on city elements.

## Capabilities

### New Capabilities

- `tooltip`: custom tooltip rendering, cursor/city positioning, portal mode, pointer/touch/pen interaction with mouse fallback, hover-intent delay, reduced-motion behavior, and compatibility with the existing text tooltip.

### Modified Capabilities

None. `openspec/specs/` has no existing tooltip capability.

## Impact

- **Public API:** new optional props `renderTooltip`, `tooltipPosition`, `tooltipPortal`, `tooltipOffset`, and `tooltipDelay`; new exported `RenderTooltipCallback` and `TooltipPosition` types. No removals or semantic changes to existing props.
- **Code:** `src/index.tsx` tooltip state, pointer handlers, and anchoring; `src/Tooltip.tsx` becomes a presentation shell accepting `children`; a small internal reduced-motion hook in `src/`; portal rendering via `react-dom` (already a peer dependency).
- **Docs/tooling:** `readme.md` tooltip API rows, examples, portal/clipping guidance, and reduced-motion note; `scripts/test-types.js` consumer usage.
- **Dependencies:** none added. React/React DOM stay peer dependencies at >=16.8, the zero-runtime-dependency rule is preserved, and the default entry bundle stays under 15 kB gzip.
- **Compatibility:** default rendering, text tooltip behavior, positioning, fade animation, DOM id, and snapshots remain unchanged when no new prop is supplied. Pointer support changes which events drive the tooltip internally, but the observable text/visibility behavior is preserved for mouse users.
