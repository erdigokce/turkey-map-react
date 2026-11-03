## Why

Consumers cannot express that a province is unavailable (outside a delivery zone, missing data, or not permitted in a flow), so they guard `onClick` themselves and give users no visual or accessible feedback. Disabled provinces are the missing half of the v2.2 selection API: they let the map behave like a real form control whose options can be unavailable.

## What Changes

This change is **additive and non-breaking**. `<TurkeyMap />`, existing props, legacy DOM ids, `data`, and existing `customStyle` objects keep working exactly as they do today.

- Add `disabledCities?: string[]` — city `id`s that render as disabled.
- Add `isCityDisabled?: (city: CityType) => boolean` — a predicate that also works with custom `data`.
- Extend `CityType` with optional `disabled?: boolean` so a custom dataset can mark provinces unavailable.
- All three sources are additive: a city is disabled when it is listed in `disabledCities`, or its `data` entry has `disabled: true`, or the predicate returns `true`. Unknown ids in `disabledCities` are ignored.
- A disabled province still renders and stays discoverable (it is not hidden). It uses a disabled fill with no hover highlight, `cursor: not-allowed`, and `aria-disabled="true"`.
- Disabled provinces do not emit interaction callbacks: neither pointer nor keyboard activation calls `onHover`, `onClick`, `onSelect`, or `onSelectionChange`, and the selection is unchanged (including an existing selection that later becomes disabled).
- In selection modes, disabled provinces remain keyboard focusable so screen readers announce them, but Enter/Space performs no activation.
- Add `disabledTooltipText?: string` for the built-in tooltip. When a disabled province is hovered with `showTooltip`, the tooltip shows `disabledTooltipText` when supplied and the city name otherwise (no tooltip change for enabled provinces).
- Add optional `customStyle.disabledColor` (default `#e5e5e5`). Disabled styling is declarative and takes precedence over hover and selected styling, so it survives re-renders.
- Update Jest/@testing-library tests, the TypeScript consumer smoke test, and the readme API tables and usage examples.

**Explicitly out of scope:** CSS variables, `className`/`style`/`svgProps` and `getCityStyle` (#54), custom tooltip renderers/portal/touch pointer support (#55), full roving-tabindex/ARIA/listbox semantics and the accessibility audit (#56), the separate data entry point (#57), hiding provinces, disabled-region grouping, per-city disabled messages in `data`, and any change to the existing `onClick`/`onHover` contracts for enabled cities.

## Capabilities

### New Capabilities

- `disabled-cities`: disabled-province sources (id list, predicate, per-city data flag), interaction suppression, disabled styling and tooltip, accessibility state, and coexistence with selection.

### Modified Capabilities

None. `openspec/specs/` has no existing `city-selection` capability; selection landed through a separate change, and this change introduces its own capability instead of rewriting that delta.

## Impact

- **Public API:** new optional props `disabledCities`, `isCityDisabled`, and `disabledTooltipText`; `CityType` gains optional `disabled`; `CustomStyleType` gains optional `disabledColor`. No removals or semantic changes to existing props.
- **Code:** `src/index.tsx` disabled resolution, event gating, and path/group rendering; a new disabled-focused test file plus updates to rendering/selection interaction tests and fixtures as needed.
- **Docs/tooling:** `readme.md` API tables, custom-data shape, and disabled-city examples; `scripts/test-types.js` consumer usage.
- **Dependencies:** none. React >=16.8 peer dependency, zero runtime dependencies, and the <15 kB gzip entry budget are preserved.
- **Compatibility:** default rendering is unchanged when no province is disabled; snapshots change only for adds like `aria-disabled` on explicitly disabled provinces.
