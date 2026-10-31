## Context

See `proposal.md` for motivation and `specs/city-selection/spec.md` for the behavior contract.

The current component (`src/index.tsx`) is a single function component with local state for the hovered city name and tooltip position. Hover color is applied by writing `path.style.fill` directly in `handleOnMouseEnter` / `handleOnMouseLeave`; React re-renders reset that mutation because `fill` is also part of the path's inline style. `CityType` and `CustomStyleType` are exported from the entry point, tests live in `src/__tests__`, and `scripts/test-types.js` compiles a standalone TypeScript consumer. Coverage thresholds are 100% statements/lines/functions and 95% branches. React is a peer dependency supporting >=16.8, so only hooks available in 16.8 may be used.

## Goals / Non-Goals

**Goals:**

- Add selection without changing the default `<TurkeyMap />` output.
- Keep one predictable selection engine for controlled and uncontrolled, single and multiple modes.
- Make selected and hover visual states declarative so they survive re-renders.
- Keep the API form-friendly and the implementation dependency-free and small.
- Preserve the existing DOM event pipeline for `onClick` / `onHover`.

**Non-Goals:**

- Disabled cities, theming/CSS variables, and configurable DOM ids (separate issues).
- Full listbox/option roles, roving tabindex, arrow-key navigation, `aria-live`, and the axe audit (#56).
- Selection persistence, search, or server-side state.
- Changing the `data` prop shape or the behavior of non-selection props.

## Decisions

### Selection state: one id array, derived per mode

Keep a single uncontrolled state `selectedIds: string[]` initialized once from `defaultSelectedCity` / `defaultSelectedCities`. Derive the effective ids on each render:

```
controlled = mode === "single" ? selectedCity !== undefined : selectedCities !== undefined
effectiveIds =
  mode === "single"
    ? (controlled ? normalize(selectedCity) : selectedIds.slice(0, 1))
    : (controlled ? normalize(selectedCities) : selectedIds)
```

- `null` and `[]` are meaningful controlled values, so controlled detection uses `!== undefined`, not truthiness. Clearing a controlled single value therefore requires `null`, not `undefined`.
- Normalization de-duplicates while preserving first-occurrence order. Callbacks map ids through an id→`CityType` map built from `data.cities`; unknown ids fall out naturally, so stale data cannot throw.
- Single mode always slices to one id even if an uncontrolled state was previously multiple. Mode changes therefore never produce an invalid single selection.
- Uncontrolled state is only written by user interaction; changing `defaultSelected*` after mount does nothing, matching standard React uncontrolled semantics.

Alternative considered: separate state for single and multiple. Rejected because mode switches would need synchronization and could lose selection unexpectedly.

### Activation pipeline: one helper for pointer and keyboard

Add `activateCity(city: CityType)` used by both the click path and the keyboard handler. It builds `nextIds` using the current effective ids:

- single: keep the city id (replace any other).
- multiple, already selected: remove it.
- multiple, not selected, below `maxSelection`: append it.
- multiple, not selected, at/above `maxSelection`: do not change selection; call `onMaxSelectionReached` if supplied, otherwise warn in development.

After computing `nextIds`, compare against the current effective ids. If unchanged, do not call `onSelectionChange`. If changed, call `onSelectionChange` with the mapped `CityType[]` and write internal state only when uncontrolled. `onSelect` fires when an activation selects a city (single replace/re-select, multiple add) and not when a multiple selection is removed.

Pointer activation stays gated on `event.target.tagName === 'path'`, preserving the existing rule that clicks on the group background do nothing. `onClick` and `onHover` continue to use the existing DOM-extraction helper unchanged. Keyboard activation receives the `CityType` already available in the render loop, so it does not depend on DOM parsing.

Alternative considered: derive selection from `onClick` only. Rejected because keyboard activation would need a separate code path and the "click path only" rule.

### Hover becomes state-driven

Replace the `path.style.fill` mutations with a `hoveredCityId` state. Derive each path's inline style from the effective selection and hover state:

```
fill = selected ? selectedColor : hovered ? hoverColor : idleColor
```

Selected wins over hover. Selected paths also get `stroke` / `strokeWidth` when configured. This fixes hover being lost on re-render and guarantees selected state cannot be wiped by React or by mouse events. With no selection the style object for a path remains `{ cursor, fill }`, so default snapshots stay stable.

Alternative considered: keep hover DOM mutation and only add selection styling. Rejected because `mouseLeave` would need to know the selected state, and React re-renders would still reset hovered paths.

### Style merging and defaults

Change `CustomStyleType` to keep `idleColor` / `hoverColor` required and add optional `selectedColor`, `selectedStroke`, `selectedStrokeWidth`. Merge defaults with the supplied object once per render so existing `{ idleColor, hoverColor }` objects still type-check. Defaults: `selectedColor` = existing `hoverColor` default (`#dc3522`), `selectedStroke` = `#7a1a10`, `selectedStrokeWidth` = `1.5`. When a consumer overrides `hoverColor` but not `selectedColor`, selected keeps the documented default rather than silently following hover; this keeps selected and hover visually distinct.

### Keyboard and focus (minimal scope)

When `selectionMode !== "none"`, each city group gets `tabIndex={0}` and an `onKeyDown` handler for Enter and Space (`preventDefault` to stop page scroll). Groups also get `onFocus` / `onBlur` to track `focusedCityId`, and the focused group receives an inline outline (`2px solid #1a73e8`, offset 2). With `"none"`, no `tabIndex` or key handler is added.

Per-city tab stops are intentionally transitional: #56 replaces them with a single roving tab stop, roles, and ARIA state. This change only guarantees that selection is operable without a mouse and that focus is visible.

Alternative considered: implement roving tabindex now. Rejected because it would duplicate #56's design and expand this change into an accessibility rewrite.

### Diagnostics

Add a small development guard (`typeof process !== "undefined" && process.env.NODE_ENV !== "production"`) and warn for:

- controlled + default prop for the same mode (controlled wins),
- selection props supplied with `selectionMode="none"`,
- props for the other selection mode (e.g. `selectedCities` in single mode),
- invalid `maxSelection` (non-integer or < 1),
- controlled selection longer than `maxSelection`,
- exceeding `maxSelection` when no `onMaxSelectionReached` handler is given.

Warnings triggered by derived values (controlled length, invalid limit) run in `useEffect` keyed on the relevant values to avoid repeating on every render; event-triggered warnings run only when the event occurs. Production builds stay silent, and a supplied `onMaxSelectionReached` suppresses the default overflow warning.

### Public types and form integration

Export `SelectionMode`, `SelectionValue` (`string | string[] | null`), and the new callback types alongside `CityType`. `selectedCity` is a primitive field value and `selectedCities` is a primitive array, so a form library can bind its field value directly. For metadata consumers, `onSelect` / `onSelectionChange` carry full `CityType` objects; the readme will show the one-line mapping to ids for react-hook-form/Formik and server actions.

Alternative considered: introduce a `name` prop and internal hidden input. Rejected as more API surface and DOM behavior than requested; forms can bind the controlled props directly.

## Risks / Trade-offs

- **Hover regressions** → existing hover/tooltip tests already assert fill transitions; keep them and add selected-over-hover precedence tests.
- **100% coverage threshold makes new branches expensive** → keep the selection engine linear and test each branch (controlled/uncontrolled, single/multiple, add/remove/limit/no-op, keyboard/no keyboard, dev/prod warnings) rather than adding defensive dead code.
- **Per-city `tabIndex={0}` creates 81 tab stops** → accepted as a temporary step; document it and let #56 replace it with roving tabindex.
- **Controlled values can exceed `maxSelection` or contain unknown ids** → never mutate controlled values; render what is supplied, filter unknown ids from callbacks, and warn once in development.
- **Warnings can fire repeatedly** → derive-value warnings live in effects keyed by values; event warnings are naturally one per event.
- **`process` may be undefined in browser bundles** → guard with `typeof process !== "undefined"`; tests can set `NODE_ENV` to cover the production branch.
- **More re-renders on hover** (all paths are recomputed) → 81 paths is small and no new state updates were introduced beyond the existing hovered-name state; no memoization complexity added.

## Migration Plan

No consumer migration. The release is additive and lands as a minor version. Existing props, DOM ids, and `customStyle` objects remain valid. Rollback is removing the optional props and state; no persisted data or schema changes exist.

## Open Questions

None.
