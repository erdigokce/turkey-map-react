## Context

See `proposal.md` for motivation and `specs/disabled-cities/spec.md` for the behavior contract.

The component (`src/index.tsx`) renders every city from `data.cities` as a `<g>` with the city `id`, `data-plakakodu`, and `data-iladi`, containing a `<path>` whose inline style is derived from `hoveredCityId` and the effective selection. Interaction callbacks are extracted from the clicked/hovered `<path>` by reading the parent group's attributes. Selection-mode city groups are already keyboard focusable (`tabIndex={0}`, Enter/Space via `activateCity`) and show an inline focus outline. `CityType` is exported from the entry point; `scripts/test-types.js` compiles a standalone TypeScript consumer; snapshots assert the default output. React supports >=16.8, so only hooks available in 16.8 may be used, and the entry bundle must stay under 15 kB gzip.

## Goals / Non-Goals

**Goals:**

- Add disabled provinces through three additive sources without changing default output.
- Suppress pointer and keyboard interaction at the city element boundary so no callback or selection path can be reached accidentally.
- Keep disabled state declarative and visually unambiguous, with a smooth path into #54's `getCityStyle` and CSS variables.
- Stay compatible with selection, custom data, `cityWrapper`, tooltips, and existing tests.

**Non-Goals:**

- CSS variables, `getCityStyle`, configurable ids, and container-level theming (#54).
- Custom tooltip rendering, portal, pointer/touch events, and hover-intent delay (#55).
- Roles, roving tabindex, `aria-live`, and the accessibility audit (#56).
- Hiding disabled provinces, region-level rules, per-city disabled messages, or a disabled-reason data model.
- Changing enabled-city behavior or introducing validation warnings for unknown ids.

## Decisions

### Resolve disabled state from three additive sources

Add a pure resolver used during rendering:

```
const disabledIds = useMemo(() => new Set(disabledCities ?? []), [disabledCities]);

const cityIsDisabled = (city: CityType): boolean =>
  disabledIds.has(city.id)
  || city.disabled === true
  || (isCityDisabled ? isCityDisabled(city) : false);
```

- The sources are additive: the predicate can disable cities that are not listed, and a `data` flag cannot be overridden by a predicate returning `false`. This matches the confirmed product decision and is the least surprising for consumers mixing built-in flags with a region rule.
- `disabledIds` is memoized only on the `disabledCities` reference; the predicate is invoked during render for each city. That keeps predicate results fresh without caching semantics that could go stale when a consumer closes over external state. 81 calls per render is negligible; if a consumer has an expensive predicate they can memoize it themselves.
- Duplicate and unknown ids are harmless because they only populate a lookup set; no validation warning is emitted, since custom data can legitimately make a built-in id unknown.
- Alternative considered: let the predicate be authoritative and override the other sources. Rejected because `data.disabled` is the dataset's explicit truth, and additive sources are easier to explain and test.

### Gate interaction at the rendered element

For a disabled city, `getCities` omits the pointer, click, and keyboard-activation handlers:

- `onMouseOver` (the `onHover` path) is not attached.
- `onClick` is not attached, so neither `onClick` nor selection activation can run.
- `onKeyDown` is not attached, so Enter/Space cannot activate while the group remains focusable.
- `onMouseEnter` / `onMouseLeave` stay attached to drive the tooltip, but they only update `hoveredCityId`; `onHover` lives in the separate `onMouseOver` handler.
- `onFocus` / `onBlur` stay attached in selection modes so focus remains visible.

This is deliberately enforced at one boundary rather than sprinkling `if (disabled)` checks inside `handleOnClick`, `activateCity`, and `handleOnKeyDown`: the existing handlers stay unchanged for enabled cities, and there is no path where a missed guard can emit a callback.

Alternative considered: keep handlers attached and early-return inside each. Rejected because it duplicates disabled knowledge across handlers and makes it easy for a future callback to bypass the guard.

### Disabled styling wins over selected and hover

Resolve each path style in this order:

```
fill = disabled ? disabledColor : selected ? selectedColor : hovered ? hoverColor : idleColor
cursor = disabled ? "not-allowed" : "pointer"
```

- Selected stroke/strokeWidth are not applied to disabled paths, so disabled cities cannot look selected.
- `CustomStyleType.disabledColor` is optional and defaults to `#e5e5e5`, matching the roadmap example. It is merged with the other style defaults once per render, so existing `{ idleColor, hoverColor }` objects keep type-checking.
- Disabled state does not alter the group markup beyond `aria-disabled`; no attributes are added when nothing is disabled, keeping the default snapshot byte-for-byte stable.
- Alternative considered: dim the selected color instead of using a dedicated disabled color. Rejected because it is not themeable and makes a selected-but-disabled city look like a variant of selected.

### Keep tooltip discovery while suppressing `onHover`

Disabled cities still participate in the internal `hoveredCityId` state when `showTooltip` is on. Tooltip text resolves as:

```
if hovered city is disabled:
  disabledTooltipText ?? tooltipText ?? city name
else:
  tooltipText ?? city name
```

- Specific disabled text wins over the global `tooltipText`, because `tooltipText` already overrides every city and `disabledTooltipText` is the more specific intent.
- `disabledTooltipText` is ignored when no disabled city is hovered, so enabled tooltips are unchanged.
- The hover state update for a disabled city is still a normal React state change; it cannot call `onHover`, and the fill is forced to `disabledColor`.
- Alternative considered: no tooltip for disabled cities. Rejected because the issue explicitly adds `disabledTooltipText` as an affordance explaining why a province is unavailable.

### Accessibility: `aria-disabled` plus inert activation

Disabled city groups render `aria-disabled="true"` (enabled groups render no `aria-disabled` attribute). In selection modes they keep `tabIndex={0}` and the existing focus outline so keyboard and screen-reader users can discover them; only activation is removed.

- `aria-disabled` is set on the group that already carries the city's accessible data attributes, so #56 can later add `role="option"` / `aria-selected` to the same element.
- The group remains focusable on purpose: an unavailable option should be announced, not skipped, and removing it from the tab order would make the map's option set inconsistent with the rendered provinces.
- In `"none"` mode no focus is added, preserving existing behavior.
- Alternative considered: skip disabled cities in the tab order. Rejected because screen-reader users would not learn that the province exists but is unavailable.

### Selection coexistence: never mutate selection because of disabled state

Resolving disabled status does not filter or rewrite the effective selection. A selected city that becomes disabled stays in the controlled/uncontrolled value, renders with disabled styling, and remains in `onSelectionChange` payloads when another enabled city changes the selection. The map simply refuses direct activation of that city until it is re-enabled.

- Filtering disabled ids out of the effective selection would silently mutate consumer state and make controlled props disagree with callbacks.
- The trade-off is that a disabled-but-selected city cannot be deselected by clicking the map; the parent clears it by updating the controlled value or by re-enabling it first. This is documented in the readme.

### Public types

Add `disabled?: boolean` to `CityType`, `disabledColor?: string` to `CustomStyleType`, and export `IsCityDisabledCallback = (city: CityType) => boolean`. New props on `IProps` are `disabledCities?: string[]`, `isCityDisabled?: IsCityDisabledCallback`, and `disabledTooltipText?: string`. No existing type becomes required.

## Risks / Trade-offs

- **A selected city becomes disabled and cannot be cleared from the map** → document it and keep controlled values authoritative; consumers can remove it from their state or re-enable it.
- **Predicate runs for all cities on every hover re-render** → 81 cheap calls per render is acceptable; document that expensive predicates should be memoized by the consumer.
- **Inline `disabledColor` does not integrate with CSS theming yet** → #54 replaces it with variables/`getCityStyle`; keep the field optional so that migration is additive.
- **`aria-disabled` on a generic `<g>` has limited semantics until roles exist** → still announces the unavailable state and is exactly where #56 will add `role`/`aria-selected`.
- **Tooltip still appears on hover of a disabled city while `onHover` is suppressed** → intentional: tooltip is disclosure, not an interaction callback; tests assert both behaviors separately.
- **Disabled styling could be invisible if a consumer picks a disabled color equal to idle** → use a clearly distinct default (`#e5e5e5`) and document that `disabledColor` should contrast with `idleColor`; no runtime validation.
- **Handler gating changes the shape of disabled groups** → enabled cities keep identical handlers, and default snapshots stay unchanged because no `aria-disabled` or disabled styles are emitted when nothing is disabled.

## Migration Plan

No consumer migration. The release is additive and lands as a minor version. Existing props, datasets, `customStyle` objects, DOM ids, and callbacks are unchanged. Rollback is removing the optional props and the disabled branch from the resolver and style selection; there is no persisted state or schema change.

## Open Questions

None.
