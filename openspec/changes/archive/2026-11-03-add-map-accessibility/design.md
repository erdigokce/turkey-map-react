## Context

See `proposal.md` for motivation and `specs/accessibility/spec.md` / `specs/city-selection/spec.md` for the behavior contract.

`src/index.tsx` is a single controlled/uncontrolled React component. Every city is rendered as a `<g id={city.id} data-plakakodu data-iladi>` containing one `<path>`; the SVG and container use the legacy ids `svg-turkiye-haritasi` and `svg-turkiye-haritasi-container`. Selection state is already derived declaratively, `activateCity` is the single selection entry point, disabled cities are resolved through `disabledCities`, `data[].disabled`, and `isCityDisabled`, and the current keyboard support adds `tabIndex={0}` to every selectable city plus an inline outline on focus. There are no generated ids, no refs, no runtime dependencies, and React 16.8 is the compatibility floor, so `useId` and other newer hooks are unavailable. The active `add-disabled-cities` change owns `aria-disabled` and inert activation; the scaffolded `add-themeable-map` change will later add `svgProps`, configurable ids, and the full `--tm-*` variable set.

`jest` runs in jsdom, `@testing-library/react` and `user-event` are available, and the default entry bundle has a 15 kB gzip budget enforced by the artifact tests. The readme carries the public API tables and is part of the definition of done.

## Goals / Non-Goals

**Goals:**

- Make the default map a single, labeled, keyboard-operable tab stop without removing any legacy markup or API.
- Keep one activation path for pointer, keyboard, and the fallback select so selection, disabled, and limit behavior cannot diverge.
- Keep the DOM deterministic for SSR and multi-instance pages without generated ids.
- Make focus and motion behavior themeable enough to survive the later theming change.
- Prove the result with focused keyboard tests, ARIA assertions, and an axe test on every supported mode.

**Non-Goals:**

- `className`, `style`, `svgProps`, container props, configurable ids, and the full CSS-variable theming API (#54).
- Custom tooltip renderers, portals, pointer/touch support, and hover-intent (#55).
- A native form control with a `name`, browser autofill wiring, or server-submitted values; `a11yFallback` is an assistive-technology aid, not a replacement for controlled selection.
- Localization of built-in labels beyond the `ariaLabel` prop.
- Wrapping or validating consumer-provided `cityWrapper` markup.
- A full WCAG audit, screen-reader matrix, or Storybook/demo changes.

## Decisions

### Put the listbox/group role on the province container, not the SVG

The existing `<g id="turkiye">` becomes the semantic province container:

```
<g
  id="turkiye"
  role={isSelectionEnabled ? "listbox" : "group"}
  aria-label={ariaLabel}
  aria-multiselectable={selectionMode === "multiple" ? true : undefined}
>
```

Its direct children are the city groups, so `role="listbox"` owns `role="option"` children without an extra generic wrapper. The outer `<svg>` keeps its legacy id and stays a graphic document; it receives no overriding role.

- Alternative considered: put `role="listbox"` on `<svg>`. Rejected because the `<g id="turkiye">` wrapper would sit between the listbox and its options, which is fragile for ARIA ownership and for axe's required-children check.
- Alternative considered: put the role on the outer `<div>`, which also contains the live region and fallback select. Rejected because those non-option children would pollute the listbox.
- `ariaLabel` defaults to `"Turkey map"` and is a new optional prop. It is the one place consumers can localize the map name. When #54 lands, `svgProps` can take precedence; this prop stays as a convenience default.

### Expose province name and state on the existing city group

Each city group gains `role`, `aria-label`, and mode-dependent state, while keeping its legacy `id`, `data-plakakodu`, and `data-iladi` attributes:

```
const label = `${city.name}, plate ${city.plateNumber}`;

<g
  id={city.id}
  data-tm-city-id={city.id}
  data-plakakodu={city.plateNumber}
  data-iladi={city.name}
  role={isSelectionEnabled ? "option" : "button"}
  aria-label={label}
  aria-selected={isSelectionEnabled ? selectedIdSet.has(city.id) : undefined}
  aria-disabled={isDisabled ? "true" : undefined}
  tabIndex={city.id === resolvedRovingId ? 0 : -1}
>
```

- `data-tm-city-id` is a new internal lookup attribute used for programmatic focus; it also avoids relying on the legacy `id`, which #54 may make configurable.
- `aria-selected` uses the effective selection set, not the visual `isSelected` flag that suppresses selected styling for disabled cities. A selected-then-disabled city is still selected in the consumer's value, so announcing it as selected plus disabled is more accurate than announcing it as unselected.
- In `"none"` mode there is no `aria-selected`; the province is a button and Enter/Space routes to `onClick`.
- The label format is fixed for this release. `aria-label` is preferred over `<title>` because it is exposed consistently on both `role="option"` and `role="button"` and is cheaper to test.
- Alternative considered: a visible `<title>` per path. Rejected because it is not reliably announced for `role="option"` and would duplicate the accessible name.

### Manage one roving tab stop with derived state and DOM lookup

`resolvedRovingId` is the current roving city when it still exists in `data.cities`; otherwise it falls back to the first selected city in data order, then the first enabled city, then the first city. `tabIndex` is `0` only for that id and `-1` for every other city, in every mode.

- Roving state (`useState<string | undefined>`) is updated on focus, by arrow navigation, and by pointer activation.
- Programmatic focus resolves the target through the `<g id="turkiye">` ref and the new `data-tm-city-id` attribute (`querySelectorAll` plus attribute comparison, not string-built selectors). This is multi-instance safe and avoids needing `CSS.escape` or generated ids.
- The fallback is computed during render, so removing the roving city from `data` repairs the map without a post-render effect that could briefly leave it unreachable.
- Alternative considered: keep `tabIndex={0}` on every city in selection modes. Rejected because it creates 81 tab stops and contradicts the issue's single-tab-stop model.
- Alternative considered: a `Map` of callback refs. Rejected because 81 ref callbacks churn on every render and add more state than a single container ref plus attribute lookup.
- Alternative considered: `useId`-based ids. Rejected because React 16.8 must be supported and generated ids can mismatch during SSR hydration.

### Handle navigation on each city group, activation in one shared path

Each city group keeps an `onKeyDown` handler, but it now handles navigation and activation together:

- ArrowRight/ArrowDown → next city in `data.cities` order.
- ArrowLeft/ArrowUp → previous city.
- Home → first city; End → last city.
- Enter/Space → activation.
- Escape → clear selection.
- Navigation clamps at the boundaries, calls `preventDefault()`, updates the roving id, and calls `.focus()` on the target group.
- The handler only acts when the event target is the city group itself or its path, so a focusable control inside a consumer's `cityWrapper` is not hijacked.

Disabled cities still get the handler so focus cannot be trapped on them; activation branches on `cityIsDisabled` and returns before any callback. This supersedes the detail in `add-disabled-cities` that omits `onKeyDown` entirely, while satisfying its contract that activation stays inert.

Activation is centralized:

```
const activateFocusedCity = (city: CityType) => {
  if (cityIsDisabled(city)) return;
  if (selectionMode === "none") {
    onClick?.(city);
    announce(city, "activated");
    return;
  }
  activateCity(city);
};
```

- Pointer clicks keep the existing path-based `onClick`/selection flow. Keyboard activation calls the same `activateCity`, and the none-mode branch calls `onClick` with the `CityType` directly instead of synthesizing a DOM event.
- Alternative considered: a single keydown handler on the container. Rejected because events from wrapped controls would bubble through the container and because the per-city handler keeps the disabled/activation branch close to the city being activated.

### Clear selection through a dedicated helper

`clearSelection` is separate from `activateCity`:

- In uncontrolled mode it sets the local selection to `[]`.
- In controlled mode it only calls `onSelectionChange([])`; the parent owns the visual result.
- It never calls `onSelect`.
- It returns without a callback when the effective selection is already empty.
- `onSelectionChange` receives the same `CityType[]` shape as other changes.

This keeps Escape from being modelled as a synthetic "toggle" and matches the controlled/uncontrolled contract in `city-selection`.

### Announce focus and selection through one polite region

A visually hidden `<div role="status" aria-live="polite" aria-atomic="true">` sits inside the map container. A single `announcement` state is written on focus and on selection changes:

- Focus: `"Ankara, plate 6"`, plus `", selected"` and/or `", disabled"` when applicable.
- Select/deselect: the city label plus the new state.
- Clear: `"No province selected"`.
- Hover and unrelated re-renders do not write to the state.

One region avoids double announcements and works for pointer selection as well as keyboard selection. The state text changes for every meaningful transition, so React commits an actual DOM change and the live region is re-announced.

- Alternative considered: `aria-live` on the container itself. Rejected because the entire map subtree would be announced on every re-render.
- Alternative considered: separate focus and selection regions. Rejected because overlapping screen-reader output is noisier than one ordered message.

### Theme the focus ring with a safe CSS-variable fallback

The existing inline outline becomes:

```
outline: `${focusStrokeWidth}px solid ${focusStroke}`,
outlineColor: `var(--tm-focus-ring, ${focusStroke})`,
outlineOffset: 2,
```

`focusStroke` defaults to `#1a73e8` and `focusStrokeWidth` to `2`; both are optional `CustomStyleType` fields. `outline` provides a valid fallback in browsers without custom-property support, and `outlineColor` lets `--tm-focus-ring` win when it exists. The focus style is applied whenever a city has focus, in every mode, and never touches fill or stroke.

- Alternative considered: wait for #54's CSS-variable system. Rejected because focus visibility is part of this change and the variable name is already specified by the roadmap.
- Alternative considered: a `:focus-visible` class. Rejected because the component currently has no stylesheet and inline styling is the established pattern; #54 can migrate it.
- Alternative considered: a separate `focusStroke` prop at the top level. Rejected to keep styling grouped under `customStyle`.

### Render the fallback select outside the SVG but inside the container

When `a11yFallback` is true in a selection mode, the map renders a real `<select>` after the SVG with inline visually-hidden clipping (`position: absolute`, 1px box, `clip: rect(0 0 0 0)`, `overflow: hidden`, no `display: none`). It is a normal tab stop for assistive technology.

- Multiple mode: `multiple` select, option per city, value is the effective selection, disabled options mirror disabled cities.
- Single mode: single select with an empty `"No selection"` option plus one option per city, so `value=""` accurately represents an empty controlled selection and choosing it clears.
- Options use the same accessible label as the city (`"İstanbul, plate 34"`).
- `onChange` converts the selected option ids into a shared `commitSelection(nextIds, addedCityIds)` path that applies selection limits, updates uncontrolled state, fires `onSelect` for newly added cities, and fires `onSelectionChange` once. A multiple-select change can add several cities at once, so `onSelect` fires for each newly added city in data order; the cap is applied to the requested set before committing, and rejected additions go through the existing `onMaxSelectionReached`/warning path.
- The fallback is ignored with a development warning in `"none"` mode, because there is no selection value to represent. It is off by default.
- Alternative considered: `display: none` or `aria-hidden`. Rejected because either removes it from the accessibility tree, defeating the purpose.
- Alternative considered: a hidden set of checkboxes. Rejected because the issue explicitly asks for a `<select>` and native selects are the most familiar fallback for form tooling.
- Alternative considered: a `name` prop. Deferred; it is native-form scope and not part of the issue.

### Disable only the tooltip fade under reduced motion

The existing injected `<style>` block gains:

```
@media (prefers-reduced-motion: reduce) {
  #svg-turkiye-haritasi-container-tooltip {
    animation: none !important;
  }
}
```

No JavaScript media-query listener is needed, SSR output stays deterministic, and the normal animation is untouched. The component has no data transitions today; any future built-in transition must add the same media-query guard.

- Alternative considered: `window.matchMedia` state. Rejected because it is a client-only effect, complicates SSR/hydration, and would need a change listener.
- Note: the selector uses the legacy tooltip id, matching current behavior. #54's configurable ids will need to revisit this selector.

### Add an axe test with a dev-only dependency

`jest-axe` (and its TypeScript types) are added to `devDependencies`. A new accessibility test renders none, single, multiple, fallback, and disabled states and asserts `toHaveNoViolations()`. Runtime dependencies stay at zero and the peer dependency range is untouched; the artifact bundle test still enforces the 15 kB budget.

- Alternative considered: manual attribute assertions only. Rejected because the issue's acceptance criterion explicitly names axe and manual assertions do not catch role/ownership regressions.
- Alternative considered: adding axe-core and writing a custom reporter. Rejected because `jest-axe` is the smallest standard wrapper.

## Risks / Trade-offs

- **Default markup and keyboard behavior change** → Document the new tab stop in the readme, update snapshots and the existing none-mode tests, and keep pointer callbacks and legacy ids byte-compatible.
- **`role="button"` provinces with no `onClick` are focusable but inert** → They still provide an accessible name and map exploration; the readme tells consumers to supply `onClick` or a selection mode when interaction is expected. The issue explicitly asks for this role.
- **SVG + ARIA support varies across screen readers** → Use well-supported roles on `<g>`, keep the native-select fallback, and avoid generated ids. The fallback is the escape hatch for AT that does not expose SVG children well.
- **Live region can be verbose while arrowing through 81 provinces** → Use one polite region, announce only focus/selection changes (not hover), and keep messages short.
- **Arrow keys on disabled provinces** → Keep the keydown handler for navigation while branching before activation; this avoids trapping focus and preserves the disabled contract.
- **Multiple-select fallback can add many cities at once** → Normalize and cap the requested set before committing, fire `onSelect` once per added city, and fire `onSelectionChange` once.
- **`cityWrapper` can wrap city groups in non-presentational markup** → The default output is correct; wrapped output is the consumer's responsibility. Document that wrappers should not add interactive children inside a province.
- **`--tm-focus-ring` is only partially integrated until #54** → The variable works for focus color now, while the rest of the theming API remains additive and can replace inline styles later.
- **`jest-axe` is a new dev dependency** → It never reaches the published package and does not affect the peer/runtime dependency contract; the artifact test verifies the bundle budget.
- **Legacy tooltip id is used in the reduced-motion selector** → Matches the current single-instance behavior; #54's configurable-id work must update it.

## Migration Plan

No consumer migration is required. The release is additive at the API level and lands as a minor version: new props and style fields are optional, `CustomStyleType` consumers without the new fields keep type-checking, legacy ids and callbacks are unchanged, and the default `<TurkeyMap />` still renders. The only intentional change is keyboard behavior: `"none"` mode gains one roving tab stop and Enter/Space `onClick` activation. Rollback is removing the new props, roles, live region, fallback, focus fields, and reduced-motion block; there is no persisted state or data migration.

## Open Questions

None.
