## Context

See `proposal.md` for motivation and the two capability specs for the behavior contract.

Current state that shapes the approach:

- `src/index.tsx` contains the whole component, imports `{ cities }` from `./data`, and applies a default `data = { cities }`. `src/data/index.ts` is a 488-line module of 81 SVG entries. `src/Tooltip.tsx` is separate.
- `npm run build` runs `tsc` (declarations plus per-file JavaScript in `lib/`) and then webpack (production, `commonjs2`, single entry `./src/index.tsx`, output `lib/index.js`). React and React DOM are webpack externals.
- `package.json` publishes `lib`, `readme.md`, and `LICENSE` via `files`, with `main: ./lib/index.js` and `types: ./lib/index.d.ts`. There is no `exports` map today.
- The current gzipped root bundle is about 86 kB, dominated by the dataset. The project's `<15 kB` budget can therefore only gate a data-free entry. Per the approved packaging decision, the budget gates `core`; the root entry gets a no-regression budget.
- Tests are Jest + `@testing-library/react` with 100% statement/line/function and 95% branch coverage. Artifact tests load `lib/index.js`; `scripts/test-package.js` checks published files and runs CJS/ESM smoke tests; `scripts/test-types.js` compiles a standalone TypeScript consumer.
- The working tree already contains in-progress `add-disabled-cities` source changes (`disabledCities`, `isCityDisabled`, `disabledColor`, `disabledTooltipText`, `CityType.disabled`). The component extraction must move the current working-tree implementation, not an older committed copy, so that change is not lost.
- React is a peer dependency supporting >=16.8, so only hooks available in 16.8 may be used (`React.memo`, `useMemo`, `useCallback`, `useRef` are available).

## Goals / Non-Goals

**Goals:**

- Make the dataset a separate runtime import while preserving the root one-liner and SSR output.
- Publish a data-free component entry whose module graph cannot accidentally include the dataset.
- Keep one component implementation, not a fork per entry point.
- Make hover, focus, and selection updates touch only the affected provinces without changing observable markup or callbacks.
- Add a deterministic, dependency-free bundle-size gate to CI.

**Non-Goals:**

- Removing the dataset from the root entry, changing `data`'s shape, or making `core` fall back to built-in data.
- Tree-shaking individual provinces, lazy-loading data, or introducing code splitting.
- Public CSS variables/classes, custom tooltip renderers, roving tabindex/listbox ARIA, or choropleth behavior (other changes own those).
- Changing `onClick`/`onHover` payload shape or selection callback semantics.

## Decisions

### 1. Split shared types, component, root wrapper, and data

Create four modules:

- `src/city-type.ts`: `CityType` only. It has no React import so the data entry can publish a React-free declaration.
- `src/types.ts`: the remaining public types (`CustomStyleType`, `ViewBoxType`, `SelectionMode`, `SelectionValue`, callback aliases, `Data`) and re-exports `CityType`.
- `src/core.tsx`: the full component implementation, importing types but **not** `./data`. Its default export accepts `data` as required:
  ```ts
  export type CoreProps = Omit<TurkeyMapProps, "data"> & { data: Data };
  ```
  At runtime it guards `data?.cities ?? []`, so untyped JavaScript that omits `data` renders zero provinces and never reaches the dataset.
- `src/index.tsx`: the root entry. It imports the core component and `{ cities }`, creates one module-level `const builtInData = { cities }`, and renders:
  ```tsx
  const TurkeyMap: React.FC<TurkeyMapProps> = (props) => (
    <CoreTurkeyMap {...props} data={props.data ?? builtInData} />
  );
  ```
  It re-exports all public types from `src/types.ts`.
- `src/data/index.ts`: types `cities` as `CityType[]` imported from `../city-type` and exports it.

Why this shape:

- The root wrapper is a few lines, so the root bundle stays effectively unchanged while the default behavior is preserved.
- `core` has no import path to `./data`, so a bundler cannot accidentally include the dataset.
- One implementation avoids drift between the two entries.
- Keeping `CityType` in a React-free module means `turkey-map-react/data` type-checks even in a consumer that only installs React type packages indirectly.

Alternatives considered:

- Keep the component in `index.tsx` and add a duplicate `core.tsx`: rejected because two implementations would drift, especially during the in-progress disabled/theme work.
- Make `core` data-optional with an empty default: rejected because silent empty maps are a worse failure mode; a type error is clearer.
- Re-export `cities` from the root as well: rejected as unnecessary; the documented dataset path is `turkey-map-react/data`.

### 2. Build both component entries and publish an `exports` map

- `webpack.config.js` becomes a multi-entry build:
  ```js
  entry: { index: './src/index.tsx', core: './src/core.tsx' },
  output: { path: path.resolve('./lib'), filename: '[name].js', libraryTarget: 'commonjs2' }
  ```
  `tsc` still emits `lib/data/index.js`, `lib/data/index.d.ts`, and declarations for both entries; webpack overwrites the two bundled JavaScript files. React externals stay unchanged.
- `package.json` adds:
  ```json
  "exports": {
    ".": { "types": "./lib/index.d.ts", "require": "./lib/index.js", "default": "./lib/index.js" },
    "./core": { "types": "./lib/core.d.ts", "require": "./lib/core.js", "default": "./lib/core.js" },
    "./data": { "types": "./lib/data/index.d.ts", "require": "./lib/data/index.js", "default": "./lib/data/index.js" },
    "./lib/*": "./lib/*",
    "./package.json": "./package.json"
  }
  ```
  `main` and `types` stay for resolvers that ignore `exports`. `./lib/*` preserves existing deep imports; `./package.json` is required by common tooling.
- No `import` condition points to ESM because the package is CommonJS; `require` plus `default` covers Node and bundlers. Adding a real ESM build is a separate packaging change.

Alternatives considered:

- Publish `core` as a second package: rejected; the issue is a subpath and a second package would fragment installs.
- Use `"./*": "./lib/*"` as the fallback: rejected because Node does not do directory/extension resolution for exports targets; an explicit `./lib/*` pattern is safer.

### 3. Province becomes the memoized rendering unit with local hover/focus state

Extract a `Province` component wrapped in `React.memo`:

```ts
type ProvinceProps = {
  city: CityType;
  isSelected: boolean;
  isDisabled: boolean;
  isSelectionEnabled: boolean;
  hoverable: boolean;
  showTooltip: boolean;
  resolvedStyle: ResolvedStyle; // stable object from useMemo
  onMouseEnterCity: (city: CityType) => void;
  onMouseLeaveCity: (city: CityType) => void;
  onHoverCity: (city: CityType) => void;
  onClickCity: (city: CityType, targetIsPath: boolean) => void;
  onActivateCity: (city: CityType) => void;
  onMouseMoveCity: (event: React.MouseEvent) => void;
};
```

- `Province` owns `hovered` and `focused` local state. Hover/focus therefore re-render only that province; the parent no longer stores `hoveredCityId` or `focusedCityId` for styling.
- The parent keeps `tooltipCity` state (and tooltip position) only when `showTooltip` is true. When the tooltip is off, hover does not update parent state at all. When it is on, the parent re-renders but memoized provinces bail out because their props are unchanged.
- Hover styling stays inline and declarative: disabled fill wins over selected, selected wins over hover, hover wins over idle. Local `hovered` only affects a province that is not selected and not disabled, matching current behavior.
- Focus styling stays the same inline outline, now driven by local state.
- Disabled provinces still call the enter/leave handlers so the tooltip can show `disabledTooltipText`, but `onHover` remains gated on `!isDisabled && hoverable`, and click/keyboard activation remains gated on `isDisabled`.
- `resolvedStyle` is memoized from `customStyle` and the documented defaults, so color updates do not create a new object on every parent render.
- `isSelected` / `isDisabled` are primitive booleans computed in the parent. When selection changes, only provinces whose booleans changed re-render.

Why local state over CSS pseudo-classes:

- It keeps all styling inline and declarative, so disabled/selected/hover precedence stays in one place and the existing snapshot and artifact expectations remain stable.
- It does not pre-empt the public theming/CSS-variable design in #54 with internal class names or variables.
- A province state update is already the smallest possible scope; CSS hover could remove even that, but at the cost of a second styling mechanism and specificity rules.

### 4. Stabilize handlers with a latest-ref dispatcher

The parent creates stable dispatcher functions once (`useCallback(..., [])` or a `useMemo` object) and updates a `latest` ref on every render with the current `onHover`, `onClick`, `onSelect`, `onSelectionChange`, `onMaxSelectionReached`, `isCityDisabled`, `cityWrapper`, and the current `activateCity` closure. Stable province handlers read `latest.current` at call time.

This preserves the existing "latest callback" tests while preventing a new callback prop from changing every province's props. Pointers for implementation:

- Click still checks that `event.target` is a `path`, preserving the rule that clicks on the group background do nothing.
- `onClick` and `onHover` keep their existing payload shape by constructing `{ id, name, plateNumber, path }` from the city object, rather than passing the raw data entry (which may now contain `disabled` or consumer extras).
- Selection callbacks continue to receive the objects from `data` by id lookup, as required by `city-selection`.
- Keyboard Enter/Space continues to call the same activation path as a click.

Alternatives considered:

- Use `useCallback` with callback props in the dependency array: rejected because parent re-renders with inline callbacks would invalidate every province.
- Remount provinces with `key` changes: rejected; it would lose local hover/focus and reset DOM.

### 5. Render-count verification

Verification uses a counting data fixture rather than a production-only backdoor:

- Each test city is created with `Object.defineProperty` getters for `name` or `path` that increment a counter when read.
- The parent passes the raw city object to `Province` without reading display fields; only `id` is read for keys/selection maps and `disabled` for disabled resolution. The province reads its own `name`/`path` while rendering.
- After an interaction, assert that only the affected city's counter advanced.
- Existing interaction, selection, disabled, edge-case, SSR, and snapshot tests cover that the visible behavior and markup stay correct; a `React.Profiler` assertion can be added around the map for the "does not commit all provinces" check, but the getter fixture is the deterministic gate.

### 6. Bundle-size gate

Add `scripts/check-bundle-size.js`, using only Node built-ins (`fs`, `zlib`, `path`):

- Read `lib/core.js` and `lib/index.js` after a build, `gzipSync` them, and print both sizes.
- Fail if `lib/core.js` exceeds `15 * 1024` bytes gzipped.
- Fail if `lib/index.js` exceeds a checked-in root baseline. Set the baseline after the implementation build with a small documented headroom (target: current ~86 kB, budget no more than ~90 kB) so the wrapper/memo refactor cannot silently grow the data-backed entry.
- Fail if either file is missing, which also catches a build that did not run.

Wire it into:

- `package.json`: `"test:bundle-size": "node scripts/check-bundle-size.js"`, and add it to `verify` after `clean-build`.
- `.github/workflows/ci.yml` package job: run `npm run test:bundle-size` after `npm run clean-build`.
- `.github/workflows/publish.yml` after the build step, before publishing, so a release cannot ship an over-budget artifact.

Alternatives considered:

- `size-limit`/`gzip-size` packages: rejected to preserve zero runtime/dev additions and avoid another dependency surface.
- Using the raw file size: rejected; gzip is the published-cost proxy and is less sensitive to formatting.
- Measuring only the root: rejected; the dataset masks component regressions and cannot enforce the 15 kB contract.

### 7. Package, type, and artifact test coverage

- `scripts/test-package.js`: add `lib/core.js`, `lib/core.d.ts` to required files; add CJS and ESM smoke snippets for `turkey-map-react/core` with custom data and `turkey-map-react/data` with 81 entries. Keep the existing root smoke assertions (81 provinces from `require('turkey-map-react')`).
- `scripts/test-types.js`: import the default from both root and `core`, import `cities` from `data`, and compile `CityType` assignments from both type paths.
- `tests/artifact/`: add `core.test.tsx` and `data.test.ts` (or extend `bundle.test.tsx`) to load `lib/core.js` and `lib/data/index.js` directly. Assert custom data renders, missing runtime data renders zero provinces, data has 81 entries, and the root bundle still renders 81.
- Jest unit tests: add render-isolation tests, keep existing snapshots unless additive markup changes, and keep coverage at the configured thresholds.
- Compatibility: `scripts/test-compat.js` already exercises the packed root; add a core-entry smoke import there if it can do so without a new harness.

## Risks / Trade-offs

- **Adding `exports` can break unlisted deep imports.** → Publish `./lib/*` and `./package.json`, keep `main`/`types`, and cover the paths in `test-package.js` and `test-types.js`.
- **Root bundle grows because it now bundles the core component plus the wrapper; root and core duplicate component code.** → The dataset dominates gzip, so the growth should be small. Enforce the root no-regression budget and inspect the size diff during implementation.
- **`React.memo` can serve stale callbacks.** → The latest-ref dispatcher is mandatory; keep the existing "latest callback after rerender" tests and add replacement tests for the other callbacks.
- **Local hover state can change tooltip timing or disabled tooltip behavior.** → Keep enter/leave notifications and the disabled tooltip tests; assert `onHover` stays inert for disabled provinces.
- **Moving state local may change initial SSR markup.** → Initial `hovered`/`focused` are `false`, and inline styles remain the same; SSR tests and snapshots are the guard.
- **In-progress `add-disabled-cities` edits live in `src/index.tsx`.** → Extract from the current working tree, run the disabled test suite, and do not rewrite or revert that change.
- **Coverage thresholds are strict (100% statements/lines/functions).** → Add tests for every new branch, including missing runtime data in `core`, disabled tooltip enter/leave, and wrapper/prop memo paths.
- **gzip size can vary slightly across zlib versions.** → Use a fixed budget with headroom for the root baseline, and keep the core budget well below 15 kB (the component code is far smaller than the dataset).
- **Data entry type declarations could pull React types.** → Put `CityType` in a React-free module and have `data` import only that type.

## Migration Plan

- Consumers need no migration: the root import, `<TurkeyMap />`, props, callbacks, types, and legacy DOM ids are unchanged.
- Custom-data consumers can optionally switch to `turkey-map-react/core` and keep the dataset out of their bundle. Consumers who want the built-in dataset independently can import `turkey-map-react/data`.
- Release as a minor version in the v2.2 line. Rollback is a normal revert: the root entry remains the source of truth and does not depend on the new subpaths.
- After merge, verify from the packed tarball (not the workspace) that root, core, and data resolve in CJS, ESM, and TypeScript consumers.

## Open Questions

None. The data-free entry name (`core`) and the budget scope (core <15 kB, root no-regression) were confirmed before planning.
