## Why

Power users want to control the rendered SVG structure, styling, and even the renderer (for example HTML instead of SVG), but the current `cityWrapper` escape hatch still leaves them with the component's DOM and cannot expose selection, roving focus, tooltip state, or ARIA wiring. A headless hook lets them reuse the map's interaction engine without adopting its markup, while dogfooding the same engine inside `TurkeyMap` keeps one behavior contract.

## What Changes

This change is **additive and non-breaking**. `<TurkeyMap />`, every existing prop, callback, legacy DOM id, and current rendered markup MUST keep working unchanged. The new hook is opt-in and the component refactor is internal.

- Add a `useTurkeyMap` hook that renders nothing and exposes the map's interaction engine:
  - state: the effective selection (`selectedCities` / `selectedIds`), focused and roving city ids, tooltip city/visibility, and the live-region announcement;
  - actions: activate a city, apply a selection value, and clear the selection;
  - ARIA and event prop getters: `getContainerProps()`, `getCityProps(city)`, and `getTooltipProps()`.
- Make the hook generic over a city subtype (`TCity extends CityType`) so custom metadata survives `data`, `getCityProps`, `selectedCities`, and every selection/disabled/hover/click callback. Extend the shared public types (`Data<TCity>`, `OnSelectCallback<TCity>`, and related callback/style types) with defaults that keep existing type usages valid.
- Require `data` in the hook (it does not import or fall back to the built-in dataset) and export `useTurkeyMap` from both `turkey-map-react` and `turkey-map-react/core`. No new package subpath is added.
- Refactor `TurkeyMap` to consume the hook for selection, roving focus, keyboard activation, announcements, disabled resolution, and tooltip state, while keeping its current SVG rendering, styling, tooltip content/portal, and native-select fallback. Existing render-isolation guarantees MUST be preserved.
- Document headless recipes (custom SVG, custom metadata, controlled/uncontrolled selection, tooltip, non-SVG renderer, live region) in the readme and a new `docs/headless.md`, and update `docs/api.md` and the TypeScript consumer smoke test.
- Keep zero runtime dependencies and the data-free `core` entry; the hook adds no dataset and no new bundled dependency.

**Explicitly out of scope:** changing the `TurkeyMap` component's props to be generic (the hook is the generic surface in this change), built-in headless styling/theming helpers, tooltip content/portal rendering inside the hook, `cityWrapper` parity in the hook, a new `headless` entry point, new keyboard or selection semantics, and changes to the built-in dataset.

## Capabilities

### New Capabilities

- `headless-hook`: the `useTurkeyMap` public API, including state, actions, prop getters, ARIA and keyboard behavior, selection semantics, tooltip state, custom-metadata generics, SSR safety, and compatibility with the rendered component.

### Modified Capabilities

- `data-entry-points`: the root and `core` entries additionally export the `useTurkeyMap` hook and its public types; the hook remains dataset-free and `core` continues to require `data`.

## Impact

- **Public API:** new `useTurkeyMap` export and hook types from `turkey-map-react` and `turkey-map-react/core`; existing callback/type aliases gain optional type parameters with `CityType` defaults.
- **Code:** new `src/useTurkeyMap.ts`; `src/core.tsx` becomes a renderer over the hook; `src/types.ts` and `src/index.tsx` export the new API. No DOM, prop, default, or callback behavior changes in `<TurkeyMap />`.
- **Tests:** new hook tests plus the existing interaction, selection, tooltip, accessibility, render-isolation, SSR, entry-point, artifact, package, and type smoke suites. Coverage thresholds remain 100% statements/lines/functions and 95% branches.
- **Docs/tooling:** `readme.md`, `docs/headless.md`, `docs/api.md`, related guides, and `scripts/test-types.js`.
- **Dependencies/size:** no runtime dependencies; React and React DOM stay peer dependencies supporting `>=16.8`; `core` stays under the 15 kB gzip budget.
- **Compatibility:** additive minor release. No consumer migration is required, and the hook refactor must produce the same rendered markup and observable behavior as before.
