## Why

The 81 built-in SVG paths live in the root entry, so every consumer downloads the dataset even when they pass custom `data`. Hover state also lives in the parent component, so moving over one province re-renders all 81 paths. This is the last v2.2 packaging/performance gap: it raises bundle size for custom-data users and makes hover unnecessarily expensive.

## What Changes

This change is **additive and non-breaking**. `turkey-map-react`, `<TurkeyMap />`, existing props, legacy DOM ids, and the root import keep their current behavior, including rendering all 81 built-in provinces when no `data` prop is supplied.

- Add a built-in data entry point: `import { cities } from "turkey-map-react/data"`. `cities` is the same 81-province dataset exported from the package root today.
- Add a data-free component entry point: `import TurkeyMap from "turkey-map-react/core"`. It exports the same component with a required `data` prop and does not import the built-in dataset, so custom-data consumers can exclude the SVG paths from their bundle.
- Keep the root entry data-backed. `turkey-map-react` continues to default `<TurkeyMap />` to the built-in dataset. The root entry becomes a thin wrapper around the core component plus the built-in data.
- Publish an `exports` map for `.`, `./core`, `./data`, and the existing deep `./lib/*` paths, with TypeScript declaration entries. Keep `main` and `types` for resolvers that do not read `exports`.
- Extract the province into a `React.memo` component so unchanged provinces do not re-render when the parent re-renders.
- Move hover and focus visual state into the province component, the smallest unit that needs it. The parent keeps hovered-city state only for the tooltip, and only updates it when the tooltip is enabled.
- Stabilize interaction handlers with a latest-ref dispatcher so changing callback props do not invalidate every province's memoization.
- Add a bundle-size check to CI: the data-free `core` entry must stay under **15 kB gzip**, and the root entry must not grow beyond its current gzipped size (no-regression budget checked into the script).
- Document the root, `core`, and `data` entry points, when to use each, and the bundle-size implications in the readme.
- Update tests for entry-point behavior, built-in/custom data separation, render counts during hover and selection, and the published package/type artifacts.

**Explicitly out of scope:** removing the built-in dataset from the root entry (that would break the `<TurkeyMap />` one-liner and SSR output of all 81 provinces), making `data` optional on the `core` entry, changing the `data` prop shape, tree-shaking individual provinces, CSS-variable theming and configurable ids (#54), custom tooltip rendering/portal/touch support (#55), full roving-tabindex and ARIA semantics (#56), choropleth/color scales (#58), a public `useTurkeyMap` hook, and any non-Jest runtime dependency.

## Capabilities

### New Capabilities

- `data-entry-points`: package subpath exports for the built-in dataset and the data-free component, root-entry compatibility, TypeScript declarations, and the documented guidance for choosing an entry point.
- `province-rendering`: memoized province rendering, per-province hover/focus state, stable interaction handlers, and render isolation so hover and selection do not re-render every province.

### Modified Capabilities

None. `city-selection` behavior (including hover vs. selected styling and keyboard focus) is unchanged and must keep passing. `disabled-cities` is a separate in-progress change; this change preserves its additive props and interaction gating while restructuring rendering.

## Impact

- **Public API:** new `turkey-map-react/core` and `turkey-map-react/data` subpaths; root default export and all existing types, props, and DOM ids remain unchanged. `core` requires `data` at the type level. Adding an `exports` map must not break existing deep `lib/*` imports.
- **Code:** split shared public types into a type module; add `src/core.tsx` (component without data import); reduce `src/index.tsx` to the data-backed wrapper; type `src/data/index.ts` as `CityType[]`; extract a memoized province component and stable handler dispatcher.
- **Build:** `webpack.config.js` gains a `core` entry and keeps the root entry; `tsconfig` output continues to provide declarations for both entries and `data`; package `files`, `main`, `types`, and `exports` must publish everything consumers import.
- **Tooling/CI:** new bundle-size script wired into `package.json` and the CI package job; `scripts/test-package.js` must verify the new files/subpaths; `scripts/test-types.js` must import from both root and subpaths.
- **Docs:** `readme.md` gains an entry-point section, bundle-size guidance, and examples for `turkey-map-react/core` with custom data and `turkey-map-react/data`.
- **Dependencies:** none added. React stays a >=16.8 peer dependency and the zero-runtime-dependency rule is preserved.
- **Compatibility:** default rendering and legacy selectors are unchanged; hover must still use `hoverColor`, selected must still win over hover, and disabled styling/callbacks must behave exactly as before.
