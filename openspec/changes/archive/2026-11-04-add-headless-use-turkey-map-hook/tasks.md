## 1. Public types and exports

- [x] 1.1 Add an optional `TCity extends CityType = CityType` parameter to `Data`, `OnSelectCallback`, `OnSelectionChangeCallback`, `OnMaxSelectionReachedCallback`, `IsCityDisabledCallback`, `CityStyleGetter`, `CityWrapper`, `RenderTooltipCallback`, and `TurkeyMapProps`, keeping every existing no-argument usage valid.
- [x] 1.2 Define the hook public types in `src/types.ts`: `UseTurkeyMapOptions`, `UseTurkeyMapResult`, `UseTurkeyMapContainerProps`, `UseTurkeyMapCityProps`, `UseTurkeyMapTooltipProps`, `UseTurkeyMapHandlers`, and `UseTurkeyMapPoint`, including the advanced `cityHandlers` / `registerCityHoverClear` fields.
- [x] 1.3 Export `useTurkeyMap` and the new hook types as named exports from both `src/index.tsx` and `src/core.tsx`; keep the root component's built-in-data injection and add no new `package.json` subpath.

## 2. Extract the interaction engine

- [x] 2.1 Create `src/useTurkeyMap.ts` and move the selection engine from `core.tsx`: controlled detection, id normalization, effective ids, `CityType` mapping, `activateCity`, `commitSelection`, `clearSelection`, `changeSelection`, callback firing, and `maxSelection` handling.
- [x] 2.2 Move disabled resolution, development warnings, roving focus, keyboard navigation/activation, focus announcements, and the `latest` refs into the hook; expose stable `cityHandlers` and `registerCityHoverClear` for the component.
- [x] 2.3 Implement `getContainerProps()` with mode-appropriate roles, `aria-label`, `aria-multiselectable`, and the container marker; implement `getCityProps(city)` with role, accessible name, `aria-selected`, `aria-disabled`, roving `tabIndex`, city marker, and stable pointer/mouse/keyboard/focus handlers.
- [x] 2.4 Move tooltip state, hover-intent timers, anchor tracking, cursor/city positioning, portal coordinate mode, visibility, and reduced-motion handling into the hook; implement `getTooltipProps()` and the `tooltipAnimationName` fade behavior, while leaving content, portal rendering, and keyframes out of the hook.
- [x] 2.5 Make handler and getter identities stable across unrelated renders, keep the latest callback/options refs, avoid parent-level hover state when the tooltip is off, and ensure no `document`/`window` access during render or in SSR.

## 3. Refactor `TurkeyMap` onto the hook

- [x] 3.1 Replace duplicated state and logic in `src/core.tsx` with a `useTurkeyMap` call, passing the required data and the interaction subset of the component props.
- [x] 3.2 Keep rendering-only behavior in `core.tsx`: container/SVG markup, legacy ids, `viewBox`, `customStyle`/`getCityStyle` resolution, focus ring, `Tooltip` content and `renderTooltip`, portal rendering, keyframes, `cityWrapper`, container/svg props, and the native-select fallback.
- [x] 3.3 Wire the memoized `Province` component to the hook's ARIA values and stable `cityHandlers`, preserving local hover/focus state, the path-target click/hover gate, and the `cityWrapper` DOM payload extraction fallback.
- [x] 3.4 Keep the component's province group as the keyboard container via the nearest-parent fallback (no new serialized marker), preserve the city marker and legacy `id` / `data-plakakodu` / `data-iladi` attributes, and confirm the rendered markup and snapshots are unchanged.
- [x] 3.5 Re-check none/single/multiple selection, disabled cities, tooltips, keyboard behavior, announcements, and render isolation against the existing component tests.

## 4. Hook behavior tests

- [x] 4.1 Add a headless harness test that renders consumer-owned SVG with the three prop getters and verifies container/city ARIA, accessible names, selected state, `tabIndex`, click/hover callbacks, and that the hook itself renders nothing.
- [x] 4.2 Add selection tests for controlled/uncontrolled single and multiple modes, `maxSelection`, `changeSelection`, `clearSelection`, none mode, unknown ids, and `onSelect` vs `onSelectionChange` payloads.
- [x] 4.3 Add keyboard/focus tests for a single roving tab stop, Arrow/Home/End navigation, Enter/Space activation, Escape clearing, disabled cities staying discoverable but inert, actual DOM focus movement, focus announcements, and roving repair after data changes.
- [x] 4.4 Add tooltip tests for opt-in behavior, hover-intent delay, cursor/city anchoring, offset and portal coordinate mode, `aria-hidden`, focus-triggered visibility, pointer non-capture, reduced motion, missing `matchMedia`, and SSR.
- [x] 4.5 Add generic-metadata coverage proving custom fields survive `data`, `selectedCities`, `getCityProps`, `onHover`, `onClick`, `onSelect`, `onSelectionChange`, and `isCityDisabled`.
- [x] 4.6 Add equivalence tests that run the same interaction through `TurkeyMap` and the headless harness and compare selection, roles, callbacks, announcements, and tooltip state; include a non-SVG/HTML renderer case.
- [x] 4.7 Confirm coverage stays at 100% statements/lines/functions and at least 95% branches, adding focused tests for new getter/handler branches rather than lowering thresholds.

## 5. Entry-point, artifact, package, and type tests

- [x] 5.1 Extend the artifact tests to require the hook from both built root and core bundles and render a small headless tree with them.
- [x] 5.2 Extend the package smoke tests to import the hook from `turkey-map-react` and `turkey-map-react/core` in CJS and ESM, and add `lib/useTurkeyMap.js` / `lib/useTurkeyMap.d.ts` to the required package files if they are emitted separately.
- [x] 5.3 Extend `scripts/test-types.js` with default-type and custom-metadata hook usage, the getter return types, advanced composition helpers, root/core imports, and a `@ts-expect-error` for omitted `data`.
- [x] 5.4 Verify no runtime dependency is added and the `core` gzip budget remains under 15 kB.

## 6. Documentation

- [x] 6.1 Add a headless section and working example to `readme.md`, link a new `docs/headless.md`, and mention the hook in the entry-point guidance.
- [x] 6.2 Write `docs/headless.md` with recipes for custom SVG, non-SVG/HTML rendering, custom metadata generics, controlled/uncontrolled selection, tooltips, the live region, a native-select fallback, memoization, and SSR.
- [x] 6.3 Update `docs/api.md` with hook options, result fields, getter prop shapes, advanced composition helpers, and the generic type parameters; update the type table for the new generic defaults.
- [x] 6.4 Cross-link the hook from `docs/getting-started.md`, `docs/selection.md`, `docs/tooltips.md`, `docs/accessibility.md`, and `docs/custom-data.md` where consumers would look next, and state that the hook renders nothing and requires `data`.

## 7. Verification

- [x] 7.1 Run `npm run typecheck` and fix any type regressions in source, tests, or the consumer smoke test.
- [x] 7.2 Run `npm test` and `npm run test:coverage`, confirming existing suites, snapshots, and coverage thresholds pass.
- [x] 7.3 Run `npm run clean-build`, `npm run test:bundle-size`, `npm run test:artifact`, `npm run test:package`, and `npm run test:types`.
- [x] 7.4 Run `npm run verify` and the React 16.8 compatibility smoke test (`REACT_VERSION=16.8.6 npm run test:compat`), then confirm no consumer migration is required.
