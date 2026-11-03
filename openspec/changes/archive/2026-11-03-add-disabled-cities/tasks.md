## 1. Public API and types

- [x] 1.1 Add optional `disabled?: boolean` to `CityType`, optional `disabledColor?: string` to `CustomStyleType`, and export an `IsCityDisabledCallback = (city: CityType) => boolean` type from `src/index.tsx`
- [x] 1.2 Add `disabledCities?: string[]`, `isCityDisabled?: IsCityDisabledCallback`, and `disabledTooltipText?: string` to `IProps` without changing any existing prop default
- [x] 1.3 Extend the resolved style merge with a `disabledColor` default of `#e5e5e5` while keeping existing `{ idleColor, hoverColor }` objects valid

## 2. Disabled resolution and rendering

- [x] 2.1 Build a memoized `disabledCities` id set and a resolver that disables a city when the id is listed, `city.disabled === true`, or `isCityDisabled` returns true; ignore duplicate and unknown ids
- [x] 2.2 Apply fill precedence `disabled > selected > hovered > idle`, set `cursor: "not-allowed"` for disabled paths, and omit selected stroke/strokeWidth on disabled paths
- [x] 2.3 Render `aria-disabled="true"` only for disabled city groups, keep disabled cities in the DOM with their existing ids and data attributes, and keep them keyboard focusable with the visible focus outline in selection modes only
- [x] 2.4 Resolve tooltip text for a hovered disabled city as `disabledTooltipText ?? tooltipText ?? city name`, leaving enabled-city tooltips unchanged

## 3. Interaction suppression

- [x] 3.1 Omit `onMouseOver`, `onClick`, and `onKeyDown` from disabled groups so `onHover`, `onClick`, `onSelect`, `onSelectionChange`, and `onMaxSelectionReached` cannot fire by pointer or keyboard
- [x] 3.2 Keep `onMouseEnter` / `onMouseLeave` for tooltip visibility and `onFocus` / `onBlur` for focus display without enabling hover or activation callbacks
- [x] 3.3 Leave selection state untouched when a selected city becomes disabled, keep controlled values rendered as supplied, and restore normal styling and interaction when the city is re-enabled

## 4. Tests

- [x] 4.1 Extend `tests/fixtures/cities.ts` as needed with a custom dataset containing per-city `disabled` entries and keep existing fixtures unchanged for current tests
- [x] 4.2 Add disabled-source tests for `disabledCities`, the predicate with custom data, `data[].disabled`, additive combination, duplicate ids, unknown ids, and the unchanged default map
- [x] 4.3 Add rendering tests for custom and default disabled color, no hover highlight, disabled-over-selected precedence, cursor, persistence across re-renders, presence in the DOM, and `aria-disabled` on disabled-only groups
- [x] 4.4 Add interaction tests proving disabled clicks, hover, and Enter/Space emit no callbacks or selection changes while enabled neighbours keep working
- [x] 4.5 Add selection-coexistence tests for selected-then-disabled, re-enabled interaction, controlled values containing disabled cities, and `onSelectionChange` payloads retaining a disabled selected city
- [x] 4.6 Add keyboard and tooltip tests for disabled focus visibility, no added tab stop in `selectionMode="none"`, custom disabled tooltip text, city-name fallback, and unchanged enabled tooltips
- [x] 4.7 Run the existing rendering snapshot and refresh it only if additive disabled markup appears in default output (default output should remain unchanged)

## 5. Documentation and verification

- [x] 5.1 Update the readme `CityType` and `CustomStyleType` type tables and add rows for `disabledCities`, `isCityDisabled`, `disabledTooltipText`, and `disabledColor`
- [x] 5.2 Add readme examples for disabling by id list, by predicate with custom data, by per-city `data.disabled`, and for disabled tooltip/styling; document that selection values are not filtered when a selected city becomes disabled
- [x] 5.3 Extend `scripts/test-types.js` with `disabledCities`, `isCityDisabled`, `disabledTooltipText`, `CityType.disabled`, and `CustomStyleType.disabledColor` usage
- [x] 5.4 Run `npm test`, `npm run test:coverage`, `npm run build`, `npm run test:artifact`, and `npm run test:types`, and confirm the default entry bundle stays under the 15 kB gzip budget
