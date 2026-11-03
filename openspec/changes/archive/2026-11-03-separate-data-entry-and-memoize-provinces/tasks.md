## 1. Module split and entry points

- [x] 1.1 Create `src/city-type.ts` containing only `CityType`, preserving the optional `disabled?: boolean` field from the in-progress disabled-cities work, with no React import.
- [x] 1.2 Create `src/types.ts` for the remaining public types (`CustomStyleType`, `ViewBoxType`, `SelectionMode`, `SelectionValue`, callback aliases, and the `Data` shape), re-exporting `CityType` from `src/city-type.ts`.
- [x] 1.3 Move the current working-tree component implementation from `src/index.tsx` into `src/core.tsx`, including the in-progress disabled-city behavior, and remove the `./data` import.
- [x] 1.4 Make `src/core.tsx` require `data` at the type level, guard `data?.cities ?? []` at runtime, and export the core props type plus all public types.
- [x] 1.5 Reduce `src/index.tsx` to the data-backed wrapper: module-level `builtInData = { cities }`, render the core component with `props.data ?? builtInData`, keep the default export, and re-export the public types.
- [x] 1.6 Type `cities` in `src/data/index.ts` as `CityType[]` using the React-free type module, without importing component code.
- [x] 1.7 Update internal imports (tests, fixtures, helpers) that referenced types from `src/index.tsx` so they still resolve through the root or the shared type modules.

## 2. Build and package metadata

- [x] 2.1 Convert `webpack.config.js` to multi-entry (`index` from `src/index.tsx`, `core` from `src/core.tsx`) with `filename: '[name].js'`, keeping `commonjs2` and the existing React externals.
- [x] 2.2 Add the `exports` map to `package.json` for `.`, `./core`, `./data`, `./lib/*`, and `./package.json`, with `types`/`require`/`default` conditions, and keep `main`, `types`, and `files` correct.
- [x] 2.3 Run `npm run clean-build` and confirm `lib/index.js`, `lib/core.js`, `lib/index.d.ts`, `lib/core.d.ts`, `lib/data/index.js`, and `lib/data/index.d.ts` exist and export the expected values.
- [x] 2.4 Update `scripts/test-package.js`: add the new required files and CJS/ESM smoke tests for `turkey-map-react/core` with custom data and `turkey-map-react/data`, while keeping the root 81-province assertions.
- [x] 2.5 Update `scripts/test-types.js` to import the default component from both root and `core`, import `cities` from `data`, and type-check `CityType` assignments from both type paths.
- [x] 2.6 Extend `scripts/test-compat.js` with a core-entry smoke import if the existing packed-tarball harness can do so without a new dependency; otherwise document why root-only compatibility remains sufficient.

## 3. Bundle-size gate

- [x] 3.1 Add `scripts/check-bundle-size.js` using only Node built-ins to gzip `lib/core.js` and `lib/index.js`, print both sizes, fail when a file is missing, fail core above 15 kB gzip, and fail root above a checked-in no-regression baseline.
- [x] 3.2 Add `"test:bundle-size": "node scripts/check-bundle-size.js"` to `package.json` and include it in the `verify` script after the build.
- [x] 3.3 Run the build and size check, record the actual core and root sizes, and set the root baseline with documented small headroom while confirming core is below 15 kB.
- [x] 3.4 Add `npm run test:bundle-size` to the CI package job after `npm run clean-build`, and to the publish workflow after its build step.

## 4. Province rendering isolation

- [x] 4.1 Extract a `Province` component wrapped in `React.memo` that renders the existing `<g>`/`<path>` markup, legacy ids, `data-*` attributes, `aria-disabled`, keyboard props, and inline styles.
- [x] 4.2 Move hover and focus visual state into `Province` local state; remove parent `hoveredCityId`/`focusedCityId` styling state while preserving hover/selected/disabled precedence and the visible focus outline.
- [x] 4.3 Keep parent hover state only for the tooltip: update tooltip content/position on enter, move, and leave only when `showTooltip` is true; do not update parent state for hover when the tooltip is off.
- [x] 4.4 Add a latest-ref dispatcher for `onHover`, `onClick`, `onSelect`, `onSelectionChange`, `onMaxSelectionReached`, `isCityDisabled`, `cityWrapper`, and the current activation closure; expose stable province handlers that read the latest values.
- [x] 4.5 Preserve `onClick`/`onHover` payloads by constructing `{ id, name, plateNumber, path }` from the city, keep the path-target click gate, keep disabled interaction gating, and keep disabled-tooltip text behavior.
- [x] 4.6 Memoize `resolvedStyle` and the selected/disabled id sets, and pass primitive `isSelected`/`isDisabled` flags so only provinces whose visual state changed re-render.
- [x] 4.7 Confirm `cityWrapper` still receives each city element with a stable key and does not force provinces with unchanged props to render.

## 5. Tests

- [x] 5.1 Add a render-count test helper using counting city fixtures, then assert hover enter, leave, and move re-render only the affected province with the tooltip both on and off.
- [x] 5.2 Assert selecting, deselecting, and replacing a controlled selection re-render only provinces whose selected state changed.
- [x] 5.3 Assert focusing and blurring a province in a selection mode re-render only that province and preserve the focus indicator and keyboard activation.
- [x] 5.4 Add callback-replacement tests for `onHover`, `onClick`, `onSelect`, `onSelectionChange`, `onMaxSelectionReached`, and `isCityDisabled`, verifying latest-callback behavior without re-rendering unaffected provinces.
- [x] 5.5 Add data-update, custom-style, and disabled-state render-isolation tests, including disabled-tooltip enter/leave and selected-over-hover precedence.
- [x] 5.6 Add entry-point tests: root renders 81 with no data, root uses custom data when supplied, core renders custom data, core with missing runtime data renders no provinces, and the data entry has 81 valid cities.
- [x] 5.7 Add artifact tests that load `lib/core.js` and `lib/data/index.js` directly, and keep `lib/index.js` rendering 81 provinces with the existing tooltip/custom-color behavior.
- [x] 5.8 Update snapshots only for intentional additive markup changes, and keep the SSR tests asserting 81 built-in provinces and unchanged legacy attributes.
- [x] 5.9 Run `npm run test:coverage` and close any coverage gaps introduced by the new modules, branches, and guards.

## 6. Documentation and final verification

- [x] 6.1 Add a readme "Entry points" section documenting `turkey-map-react`, `turkey-map-react/core`, and `turkey-map-react/data`, with examples for both custom-data usage and importing the built-in dataset.
- [x] 6.2 Document the bundle-size implications (root includes data, core does not, data is standalone) and keep the existing readme API table and examples accurate.
- [x] 6.3 Run `npm run typecheck`, `npm run test:coverage`, `npm run clean-build`, `npm run test:artifact`, `npm run test:package`, `npm run test:types`, `npm run test:bundle-size`, and `npm run test:compat`.
- [x] 6.4 Confirm the root gzipped bundle is unchanged or smaller than the recorded baseline and the core entry is under 15 kB gzip; record both numbers in the final report.
- [x] 6.5 Run `openspec validate "separate-data-entry-and-memoize-provinces" --strict` and confirm the change remains valid.
