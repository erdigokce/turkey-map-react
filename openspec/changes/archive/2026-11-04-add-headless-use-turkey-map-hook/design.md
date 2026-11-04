## Context

See `proposal.md` for motivation and `specs/headless-hook/spec.md` for the behavior contract.

`src/core.tsx` currently contains the entire map engine and renderer in one component: controlled/uncontrolled selection, `maxSelection`, disabled resolution, roving focus, keyboard activation, live-region announcements, tooltip state/timers/positioning, inline style resolution, the SVG markup, the native-select fallback, `cityWrapper`, portal rendering, and instance-id handling. `src/index.tsx` only injects the built-in dataset. Types live in `src/types.ts`, `CityType` has fixed fields, and every existing behavior is covered by Jest/Testing Library tests with 100% statement/line/function and 95% branch thresholds.

Two existing constraints shape the refactor. First, `province-rendering` requires hover, focus, and selection updates to re-render only affected provinces; the component achieves that with a memoized `Province` component, local hover/focus state, and `latest` refs for callbacks. Second, `cityWrapper` consumers can clone a city element and remove legacy `id` / `data-*` attributes, and existing tests require the click/hover payload to degrade to empty values in that case. The headless hook must not weaken either constraint.

## Goals / Non-Goals

**Goals:**

- Extract the interaction engine into a hook with one behavior contract used by both the hook and `TurkeyMap`.
- Keep the component's rendered markup, ids, props, callbacks, accessibility semantics, tooltip behavior, and render isolation byte-for-byte compatible.
- Provide stable getters and handlers so memoized headless city renderers do not re-render on unrelated interactions.
- Make the hook generic over custom city metadata without breaking existing type aliases.
- Keep the hook dataset-free, dependency-free, SSR-safe, and available from the existing root and `core` entries.

**Non-Goals:**

- Making `TurkeyMap` itself generic; the hook is the generic surface in this change.
- Moving styling, `customStyle`, `getCityStyle`, `cityWrapper`, tooltip content/`renderTooltip`, portal rendering, the native-select fallback, or instance-id generation into the hook.
- Adding a new package subpath or a new renderer component.
- Changing selection, keyboard, tooltip, or accessibility semantics.

## Decisions

### The hook owns the engine; `TurkeyMap` becomes a renderer

`src/useTurkeyMap.ts` will own selection, disabled resolution, roving focus, keyboard activation, announcements, tooltip state/timers/positioning, development warnings, and the same `latest` refs used today. `src/core.tsx` will keep only rendering concerns: container/SVG markup, legacy ids, styles, `Tooltip` content and portal, the native select, `cityWrapper` composition, and `viewBox`.

Alternative considered: leave the engine in `core.tsx` and build a thin hook wrapper around it. Rejected because a wrapper cannot be called independently of the component and would not satisfy dogfooding; it would also split the behavior contract across two implementations.

### Hook options are the interaction subset of the component props

`UseTurkeyMapOptions<TCity>` requires `data` and accepts the interaction-relevant props: `visible`, `hoverable`, selection props and callbacks, `disabledCities`, `isCityDisabled`, `onHover`, `onClick`, `showTooltip`, tooltip positioning/portal/delay options, and `ariaLabel`. It deliberately omits layout, styling, wrappers, tooltip content, and fallback props. An internal `tooltipAnimationName` option lets `TurkeyMap` preserve the per-instance fade animation; when it is omitted, the hook hides the tooltip with `visibility: hidden` so a headless consumer is not required to render keyframes.

The hook result exposes:

- state: `selectedCities`, `selectedIds`, `rovingCityId`, `focusedCityId`, `tooltipCity`, `tooltipVisible`, `announcement`;
- actions: `activateCity`, `changeSelection`, `clearSelection`;
- getters: `getContainerProps()`, `getCityProps(city)`, `getTooltipProps()`;
- advanced composition helpers: stable `cityHandlers` and `registerCityHoverClear`.

`cityHandlers` exists because `TurkeyMap` still needs per-city local hover/focus state to preserve render isolation. The handlers take the city explicitly (`onEnter(city, element, point)`, `onActivate(city, event?)`, and so on), so the component never has to look a city up from DOM attributes that `cityWrapper` may have removed. The public getters use the same handlers and resolve the city from `data-tm-city-id`, which keeps headless markup simple.

Alternative considered: expose only the prop getters. Rejected because the memoized `Province` component would need per-city closures or DOM lookups to compose local state, weakening either render isolation or `cityWrapper` compatibility.

### Getters keep stable handler identities

`getCityProps(city)` returns new ARIA/data objects as state changes, but its event handler references are stable `useCallback` functions that read the latest options and city map from refs. This lets a headless consumer wrap `getCityProps(city)` in a memoized city component without re-rendering every city when selection, focus, or tooltip state changes elsewhere.

`getContainerProps()` includes `role`, the accessible name, `aria-multiselectable`, and a `data-tm-map-container` marker. `getCityProps()` includes `data-tm-city-id`. Keyboard focus movement uses `event.currentTarget.closest('[data-tm-map-container]')`, falling back to the nearest parent element, and then queries the city elements inside that container. This works with arbitrary wrapper depth, multiple maps, and non-SVG renderers. `TurkeyMap` does not serialize a new marker onto its province group because that would change the rendered markup and snapshots; it relies on the nearest-parent fallback, while headless consumers get the marker from `getContainerProps()`.

Alternative considered: a context or required container ref. Rejected because it adds wiring to the headless API and makes multiple maps or portals harder.

### Generic city types flow through the hook, not the component

`Data`, `OnSelectCallback`, `OnSelectionChangeCallback`, `OnMaxSelectionReachedCallback`, `IsCityDisabledCallback`, `CityStyleGetter`, `CityWrapper`, `RenderTooltipCallback`, and `TurkeyMapProps` gain an optional `TCity extends CityType = CityType` parameter. Existing imports without type arguments keep the current `CityType` shape. `useTurkeyMap<TCity>` uses that parameter for `data`, state, getters, and callbacks, so a consumer's `CityType & { region: string }` survives the entire hook surface.

Alternative considered: make `CityType` itself generic over metadata. Rejected because it would ripple through every declaration and make the base city shape harder to read; `TCity extends CityType` gives consumers the same result with a smaller compatibility surface.

### Tooltip behavior is split between state and presentation

The hook owns tooltip visibility, hover intent, timers, anchor tracking, reduced-motion handling, and positioning. `getTooltipProps()` returns `role`, `aria-hidden`, and inline positioning/visibility styles, but no content and no portal. `TurkeyMap` continues to resolve `tooltipText` / `disabledTooltipText` / `renderTooltip`, render the `Tooltip` shell, apply the legacy id and keyframes, and choose inline versus `document.body` rendering.

When the hook hides a tooltip without an animation name, it sets `visibility: hidden` immediately. When `TurkeyMap` supplies `tooltipAnimationName`, the hook preserves the existing fade-out behavior and the component keeps rendering the matching keyframes.

Alternative considered: return rendered tooltip content from the hook. Rejected because it couples the hook to presentation, makes the headless API less useful for custom content, and does not solve portal ownership.

### Accessibility stays declarative and shared

`getContainerProps()` and `getCityProps()` produce the same roles, names, selected/disabled state, and roving `tabIndex` that `TurkeyMap` renders today. `TurkeyMap` will apply those values to its existing `<g>` and preserve its local focus outline and live region. Headless consumers receive the same `announcement` string and are responsible for rendering a visually hidden `role="status"` region; the docs include the exact markup.

The native-select fallback stays in `TurkeyMap`, driven by `selectedIds`, `isCityDisabled`, and `changeSelection`. The hook exposes those, so a headless consumer can build the same fallback if needed without a separate hook API.

Alternative considered: expose fallback option props from the hook. Rejected as presentation-specific and outside the issue's acceptance criteria.

### Entry points and packaging

`useTurkeyMap` is exported as a named export from both `src/index.tsx` and `src/core.tsx`; the hook types are re-exported from both. The hook lives in `src/useTurkeyMap.ts`, imports no dataset, and is bundled into the existing root and core webpack entries. No `package.json` subpath is added. The root component still supplies the built-in dataset; the root hook still requires `data`, so it never silently loads 81 provinces.

## Risks / Trade-offs

- **Render-isolation regression from unstable handlers** → Keep the existing memoized `Province`, local hover/focus state, and `latest` refs; make getter and `cityHandlers` identities stable; keep the render-count tests as the gate.
- **Behavior drift while moving a large component** → Move logic into the hook without redesigning it, keep every existing test, and add equivalence tests that run the same interaction through `TurkeyMap` and a headless harness.
- **`cityWrapper` payload regressions** → Core keeps the existing path-target check and DOM payload extraction; the hook receives the city explicitly through `cityHandlers`, and the edge-case tests for removed attributes stay in place.
- **Larger public API than the issue sketch** → Document `cityHandlers` and `registerCityHoverClear` as advanced composition helpers; the common path remains `getContainerProps` / `getCityProps` / `getTooltipProps`.
- **Headless re-renders when tooltip, focus, or selection changes** → Stable handler identities and documented memoization; the hook does not add parent-level hover state when the tooltip is disabled.
- **Tooltip fade without keyframes in headless apps** → Hide with `visibility: hidden` unless `tooltipAnimationName` is supplied; only `TurkeyMap` opts into the fade.
- **Type-parameter regressions for existing consumers** → Default every new type parameter to `CityType`; extend the TypeScript consumer smoke test with both default and custom-metadata usage.
- **DOM-marker dependency for headless keyboard navigation** → `getContainerProps()` must be applied to the ancestor; document it in the headless guide and test arrow/Home/End behavior through a headless harness. The rendered component uses the nearest-parent fallback so its existing snapshots stay unchanged.

## Migration Plan

Additive minor release. No consumer migration is required: existing imports, props, callbacks, markup, ids, and type aliases keep working. Rollback is removing the hook export and reverting `core.tsx` to the previous implementation; no persisted state, schema, or package subpath changes are involved.

## Open Questions

None.
