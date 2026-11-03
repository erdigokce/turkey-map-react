## 1. Public API and test tooling

- [x] 1.1 Add optional `ariaLabel?: string` and `a11yFallback?: boolean` to `IProps` in `src/index.tsx`, without changing existing defaults
- [x] 1.2 Add optional `focusStroke?: string` and `focusStrokeWidth?: number` to `CustomStyleType`, and extend the resolved style defaults with `#1a73e8` and `2`
- [x] 1.3 Add `jest-axe` and `@types/jest-axe` to `devDependencies` only; confirm `package.json` runtime dependencies and the React peer range are unchanged

## 2. Semantic container and province markup

- [x] 2.1 Give the `<g id="turkiye">` container `role="listbox"` in single/multiple mode, `role="group"` in none mode, `aria-label={ariaLabel}`, and `aria-multiselectable` only in multiple mode
- [x] 2.2 Give every city group a `"<name>, plate <plateNumber>"` accessible name, `role="option"` plus `aria-selected` in selection modes, and `role="button"` without `aria-selected` in none mode
- [x] 2.3 Preserve each city's legacy `id`, `data-plakakodu`, `data-iladi`, and `aria-disabled` output, and add a stable `data-tm-city-id` attribute for focus lookup
- [x] 2.4 Add a visually hidden `role="status"` live region with `aria-live="polite"` and `aria-atomic="true"` inside the map container without generated ids

## 3. Roving tabindex and keyboard navigation

- [x] 3.1 Add roving state and derive the resolved roving id as current id if rendered, else first selected city in data order, else first enabled city, else first city
- [x] 3.2 Render `tabIndex={0}` only for the resolved roving city and `tabIndex={-1}` for every other province in all modes, repairing the tab stop when data removes the current city
- [x] 3.3 Attach a per-city `onKeyDown` handler that moves focus with ArrowRight/ArrowDown (next), ArrowLeft/ArrowUp (previous), and Home/End, clamps at boundaries, and updates the roving id
- [x] 3.4 Keep the keydown handler on disabled cities for navigation while branching before activation so Enter/Space stays inert, and resolve focus targets through the container ref plus `data-tm-city-id`
- [x] 3.5 Ignore navigation keys when the event target is not the city group or its path, so focusable content inside `cityWrapper` is not hijacked

## 4. Activation, clearing, and announcements

- [x] 4.1 Centralize keyboard activation: Enter/Space uses `activateCity` in selection modes and calls `onClick(city)` in none mode, with `preventDefault()` and no-op for disabled cities
- [x] 4.2 Add `clearSelection` for Escape that clears uncontrolled state, only notifies in controlled mode through `onSelectionChange([])`, never fires `onSelect`, and does nothing when already empty
- [x] 4.3 Write focus and selection changes into the live-region state, including selected/disabled state and `"No province selected"` on clear, while leaving hover and unrelated re-renders silent
- [x] 4.4 Add a development-only warning when `a11yFallback` is enabled in `"none"` mode, and keep production quiet

## 5. Focus styling and reduced motion

- [x] 5.1 Replace the hardcoded focus outline with the resolved `focusStroke`/`focusStrokeWidth` values, keep a safe solid-outline fallback, and set `outlineColor` to `var(--tm-focus-ring, <focusStroke>)` so older browsers still show a ring
- [x] 5.2 Apply the focus style whenever a city has focus in every mode, including none mode, without changing fill or stroke
- [x] 5.3 Add a `@media (prefers-reduced-motion: reduce)` rule that disables the tooltip fade animation while preserving the existing animation when reduced motion is not requested

## 6. Accessible fallback select

- [x] 6.1 Render the visually hidden native `<select>` only when `a11yFallback` is true and a selection mode is active; use `multiple` in multiple mode and a single select with an explicit empty option in single mode
- [x] 6.2 Populate one option per rendered city in data order with the province accessible label, disabled options for disabled cities, and a value synchronized with the effective selection
- [x] 6.3 Route fallback changes through a shared selection commit that applies single/multiple semantics, respects `maxSelection`, fires `onSelect` for newly added cities, and fires `onSelectionChange` once

## 7. Tests

- [x] 7.1 Add `src/__tests__/TurkeyMap.accessibility.test.tsx` covering container roles/names, `aria-multiselectable`, province labels including plate numbers, option/button roles, and `aria-selected`/`aria-disabled`
- [x] 7.2 Add keyboard tests for exactly one tabbable province, the selected/enabled/first fallback order, Arrow/Home/End navigation, boundary clamping, disabled-province navigation, and none-mode Enter/Space `onClick`
- [x] 7.3 Add selection keyboard tests for Enter/Space in single and multiple modes, Escape clearing in controlled and uncontrolled modes, empty Escape, and disabled activation staying inert
- [x] 7.4 Add live-region tests for focus, disabled focus, select/deselect, clear, and silence on hover or unrelated re-renders
- [x] 7.5 Add focus-ring tests for the default ring, custom `focusStroke`/`focusStrokeWidth`, the CSS-variable outline color, and focus visibility in none mode
- [x] 7.6 Add fallback tests for single and multiple value synchronization, option labels, disabled options, controlled updates, fallback-driven callbacks and limits, default-off behavior, and the none-mode warning
- [x] 7.7 Add a reduced-motion test asserting the media-query rule is present when the tooltip is enabled
- [x] 7.8 Add axe tests with `toHaveNoViolations()` for none, single, multiple, fallback, and disabled-province states
- [x] 7.9 Update existing rendering, selection-rendering, disabled, SSR, and snapshot tests for the new roles, labels, data attributes, roving tabindex, and none-mode tab stop
- [x] 7.10 Extend `scripts/test-types.js` with `ariaLabel`, `a11yFallback`, `focusStroke`, and `focusStrokeWidth` usage

## 8. Documentation and verification

- [x] 8.1 Add a readme Accessibility section documenting the container/province semantics, the single tab stop, Arrow/Home/End/Enter/Space/Escape shortcuts, the live region, and the intentional none-mode keyboard change
- [x] 8.2 Update the readme API tables and type table with `ariaLabel`, `a11yFallback`, `focusStroke`, `focusStrokeWidth`, and examples for the fallback select and focus customization
- [x] 8.3 Document that `--tm-focus-ring` is honored now, the full `--tm-*` theming API remains future work, and `cityWrapper` should not add interactive children inside a province
- [x] 8.4 Run `npm test`, `npm run test:coverage`, `npm run build`, `npm run test:artifact`, and `npm run test:types`; confirm the default entry bundle stays under the 15 kB gzip budget and SSR output remains deterministic
