## Why

Consumers must track which city is selected themselves, and the map has no visual selected state, so it cannot serve as a form control. Hover is applied by mutating `path.style.fill` directly, leaving no declarative source of truth, so any visual state is lost on re-render. Selection is the highest-leverage v2.2 feature: it turns the demo map into an address/province picker that drops into forms.

## What Changes

This change is **additive and non-breaking**. Defaults and existing behavior stay intact: `<TurkeyMap />`, `onClick`, `onHover`, legacy DOM ids, and the current `customStyle` shape continue to work.

- Add `selectionMode?: "single" | "multiple" | "none"` (default `"none"`). `onClick` and `onHover` keep firing in every mode.
- Add controlled and uncontrolled selection for both modes:
  - single: `selectedCity?: string | null` / `defaultSelectedCity?: string`
  - multiple: `selectedCities?: string[]` / `defaultSelectedCities?: string[]`
  - Selection values are city `id`s; controlled props win over uncontrolled ones and a development warning is emitted when both are supplied.
- Add `onSelect?: (city: CityType) => void` for the individual city interaction and `onSelectionChange?: (cities: CityType[]) => void` for the full current selection. `onSelectionChange` always receives an array (zero or one item in single mode) of full `CityType` objects.
- Add `maxSelection?: number` for multiple mode. Attempts beyond the limit are ignored; developers can supply `onMaxSelectionReached?: (city: CityType, selectedCities: CityType[], maxSelection: number) => void`. Without that handler, development builds emit a `console.warn`.
- Make selected a first-class, declarative visual state independent of hover that survives re-renders. `customStyle` gains optional `selectedColor`, `selectedStroke`, and `selectedStrokeWidth`; omitting them preserves the existing look.
- Add minimal keyboard activation (Enter/Space) for selection modes, with a visible focus indicator. Full roving tabindex, listbox/option semantics, `aria-live`, and the audit remain in #56.
- Expose the selection value shape (`string | null` for single, `string[]` for multiple) so it can be bound directly to react-hook-form, Formik, or a server action, with a one-line id mapping for the `CityType[]` callbacks.
- Update tests (unit + behavior), the TypeScript consumer smoke test, and the readme API table/usage examples.

**Explicitly out of scope:** disabled/unavailable cities (#53), CSS-variable theming and configurable ids (#54), full keyboard navigation and ARIA semantics (#56), separate data entry point (#57), region/choropleth behavior, selection persistence, search/filter, and any change to the existing `onClick`/`onHover` contracts.

## Capabilities

### New Capabilities

- `city-selection`: selection modes, controlled and uncontrolled single/multiple selection, value normalization, selection limits and callbacks, declarative selected styling, and minimal keyboard activation.

### Modified Capabilities

None. `openspec/specs/` has no existing capability specs.

## Impact

- **Public API:** new optional props and types on `TurkeyMap`; `CustomStyleType` gains optional fields. No removals or semantic changes to existing props.
- **Code:** `src/index.tsx` component state/rendering and exported types; `src/__tests__/TurkeyMap.interactions.test.tsx`, `TurkeyMap.rendering.test.tsx`, and new selection-focused tests; `tests/helpers.ts` and fixtures as needed.
- **Docs/tooling:** `readme.md` API table and selection examples; `scripts/test-types.js`; bundle-size check remains under the <15 kB gzip budget (selection adds no dependency).
- **Dependencies:** none. React >=16.8 peer dependency and zero runtime dependencies are preserved.
- **Compatibility:** existing snapshots and tests must either remain valid or be updated only for additive markup/style; no consumer migration is required.
