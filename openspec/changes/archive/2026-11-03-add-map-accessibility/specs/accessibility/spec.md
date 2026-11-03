## Purpose

Makes the map usable without a pointer by exposing labeled province and selection semantics, a single roving tab stop, predictable keyboard navigation, live announcements, a visible themeable focus ring, and an optional native-select fallback for assistive technology.

## ADDED Requirements

### Requirement: The map exposes a labeled, mode-appropriate semantic container

The element that contains the provinces SHALL expose `role="listbox"` when `selectionMode` is `"single"` or `"multiple"`, and `role="group"` when `selectionMode` is `"none"`. The container MUST have an accessible name derived from `ariaLabel`, which defaults to `"Turkey map"` and MAY be overridden by the consumer. In `"multiple"` mode the container MUST expose `aria-multiselectable="true"`; in `"single"` and `"none"` modes it MUST NOT claim multiselectability. Legacy container and SVG ids MUST remain unchanged.

#### Scenario: Single mode is a single-select listbox

- **WHEN** `selectionMode="single"` is rendered
- **THEN** the province container has `role="listbox"`, an accessible name, and no `aria-multiselectable="true"`

#### Scenario: Multiple mode is a multiselect listbox

- **WHEN** `selectionMode="multiple"` is rendered
- **THEN** the province container has `role="listbox"` and `aria-multiselectable="true"`

#### Scenario: None mode is a labeled group

- **WHEN** `selectionMode` is omitted or `"none"`
- **THEN** the province container has `role="group"` and the same accessible name

#### Scenario: The accessible name can be localized

- **WHEN** `ariaLabel="Türkiye haritası"` is supplied
- **THEN** the province container's accessible name is `"Türkiye haritası"` and the default name is not also announced

#### Scenario: Legacy ids are preserved

- **WHEN** any mode is rendered
- **THEN** `#svg-turkiye-haritasi-container`, `#svg-turkiye-haritasi`, and the existing city group ids are still present

### Requirement: Every province has an accessible name and an accurate state

Every province MUST expose an accessible name that contains its display name and its plate number in the form `"<name>, plate <plateNumber>"`. In selection modes a province MUST expose `role="option"` and `aria-selected` reflecting whether its city id is in the effective selection, including a selected city that is currently disabled. In `"none"` mode a province MUST expose `role="button"` and MUST NOT expose `aria-selected`. A disabled province MUST keep `aria-disabled="true"` and MUST NOT lose its accessible name.

#### Scenario: Province name includes the plate number

- **WHEN** the built-in İstanbul province is rendered
- **THEN** its city element is named `"İstanbul, plate 34"`

#### Scenario: Selected option state is exposed

- **WHEN** a city is in the effective selection in single or multiple mode
- **THEN** its city element has `role="option"` and `aria-selected="true"`

#### Scenario: Unselected option state is exposed

- **WHEN** a city is not in the effective selection in a selection mode
- **THEN** its city element has `aria-selected="false"`

#### Scenario: None mode uses buttons

- **WHEN** `selectionMode="none"` is rendered
- **THEN** each city element has `role="button"` and no `aria-selected` attribute

#### Scenario: Disabled state is not overwritten

- **WHEN** a disabled province is rendered in a selection mode
- **THEN** it keeps its accessible name, has `aria-disabled="true"`, and exposes its actual selected state without becoming visually selected

### Requirement: The map is a single roving tab stop

Regardless of selection mode, exactly one province MUST be in the tab order (`tabIndex={0}`) and every other province MUST be removed from it (`tabIndex={-1}`). The roving province MUST default to the first selected city in data order when a selection exists, otherwise the first enabled province, otherwise the first province. If the current roving province disappears after a data change, the map MUST fall back to a valid province rather than leaving the map unreachable by Tab.

#### Scenario: Only one province is tabbable

- **WHEN** any mode is rendered with multiple provinces
- **THEN** exactly one city element has `tabindex="0"` and all others have `tabindex="-1"`

#### Scenario: Selection determines the initial tab stop

- **WHEN** multiple mode renders with Ankara selected and Ankara is the selected city in data order
- **THEN** Ankara is the tabbable province

#### Scenario: First enabled province is the fallback

- **WHEN** no city is selected and the first province in data order is disabled
- **THEN** the first enabled province is the tabbable province

#### Scenario: Data changes repair the tab stop

- **WHEN** the current roving province is removed by a data update
- **THEN** another rendered province becomes tabbable and the map remains reachable by Tab

#### Scenario: Disabled provinces stay discoverable

- **WHEN** a disabled province is included in the rendered data
- **THEN** it participates in the roving order and can receive focus, while remaining inert on activation

### Requirement: Keyboard navigation moves focus predictably

When a province has focus, ArrowRight and ArrowDown MUST move focus to the next province in data order, ArrowLeft and ArrowUp MUST move focus to the previous province, Home MUST move to the first province, and End MUST move to the last. Navigation MUST stop at the first and last province rather than wrapping. Focus movement MUST update the roving tab stop and MUST be applied to the actual focused city element, not only to visual state. Disabled provinces MUST be included in the navigation order.

#### Scenario: Arrow keys move to the next and previous province

- **WHEN** the second province is focused and the user presses ArrowRight or ArrowDown
- **THEN** the third province receives focus
- **AND** pressing ArrowLeft or ArrowUp from the third province returns focus to the second

#### Scenario: Home and End reach the boundaries

- **WHEN** any province is focused and the user presses Home or End
- **THEN** the first or last province in data order receives focus respectively

#### Scenario: Navigation clamps at the boundaries

- **WHEN** the first province is focused and the user presses ArrowLeft or ArrowUp
- **THEN** focus stays on the first province
- **AND** the last province behaves the same way for ArrowRight and ArrowDown

#### Scenario: Focus movement updates the tab stop

- **WHEN** focus moves from one province to another with the keyboard
- **THEN** the newly focused province becomes the only province with `tabindex="0"`

#### Scenario: Disabled neighbours remain in the order

- **WHEN** keyboard navigation reaches a disabled province
- **THEN** that province receives focus and is announced as disabled instead of being skipped

### Requirement: Focus is always visible and themeable

A focused province MUST render a visible focus ring in every selection mode, including `"none"`. The ring MUST default to a 2px `#1a73e8` outline with a visible offset. `customStyle.focusStroke` and `customStyle.focusStrokeWidth` MUST be optional overrides, and the ring color MUST use the `--tm-focus-ring` CSS custom property when the consumer defines it. Omitting the new fields MUST preserve the existing focus appearance. The focus ring MUST NOT change province fill, hover, selected, or disabled styling.

#### Scenario: Default focus ring is visible

- **WHEN** a province receives focus in any mode and no focus customization is supplied
- **THEN** it renders a visible 2px `#1a73e8` outline

#### Scenario: Custom focus stroke is applied

- **WHEN** `customStyle` supplies `focusStroke: "#ff0000"` and `focusStrokeWidth: 3`
- **THEN** the focused province renders a visible 3px `#ff0000` outline

#### Scenario: CSS variable overrides the focus color

- **WHEN** the consumer defines `--tm-focus-ring` and focuses a province
- **THEN** the focus ring uses that variable while the configured fallback remains available when the variable is absent

#### Scenario: Focus styling does not affect fills

- **WHEN** a focused province is idle, hovered, selected, or disabled
- **THEN** its fill and selection stroke remain governed by the existing style rules

### Requirement: A polite live region announces focus and selection

The map MUST render a visually hidden live region with `aria-live="polite"` and `aria-atomic="true"`. It SHALL announce the focused province's accessible name, including disabled state when applicable, when focus enters or moves between provinces. It SHALL announce selection changes, including clearing, once per change. Unrelated re-renders and pointer hover MUST NOT produce announcements.

#### Scenario: Focus is announced

- **WHEN** keyboard focus moves to Ankara
- **THEN** the live region announces `"Ankara, plate 6"`

#### Scenario: Disabled focus is announced

- **WHEN** keyboard focus moves to a disabled province
- **THEN** the live region announces the province name, plate number, and that it is disabled

#### Scenario: Selection is announced

- **WHEN** a city is selected or deselected
- **THEN** the live region announces the resulting selection state once

#### Scenario: Clearing is announced

- **WHEN** the user clears a selection with Escape
- **THEN** the live region announces that no province is selected

#### Scenario: Hover is not announced

- **WHEN** the pointer moves over a province without focus or selection changing
- **THEN** the live region text does not change

### Requirement: Optional native-select fallback for assistive technology

The component SHALL accept an optional `a11yFallback` prop that defaults to `false`. When `true` in a selection mode, the map MUST render a visually hidden but focusable native `<select>` containing one option per rendered province in data order. The select MUST be `multiple` in multiple mode; in single mode it MUST be a single select with an explicit empty option for clearing. Disabled provinces MUST render disabled options. The select value MUST reflect the effective selection and MUST stay synchronized with controlled and uncontrolled updates. Changing the select MUST use the same selection semantics and callbacks as activating the map. Enabling the fallback MUST NOT alter the map's own roles, names, or keyboard model.

#### Scenario: Single-mode fallback reflects selection

- **WHEN** `selectionMode="single"` and `a11yFallback` are enabled with Ankara selected
- **THEN** a visually hidden single select is rendered with an option per province and Ankara selected

#### Scenario: Multiple-mode fallback allows several options

- **WHEN** `selectionMode="multiple"` and `a11yFallback` are enabled
- **THEN** a visually hidden multiple select is rendered and more than one province can be selected

#### Scenario: Fallback changes selection

- **WHEN** the user changes the fallback select
- **THEN** the same `onSelect` / `onSelectionChange` callbacks fire as for the equivalent map activation

#### Scenario: Controlled updates reach the fallback

- **WHEN** the parent changes `selectedCity` or `selectedCities`
- **THEN** the fallback select's value updates to the new effective selection

#### Scenario: Disabled options are unavailable

- **WHEN** a province is disabled
- **THEN** its fallback option is disabled

#### Scenario: Fallback is off by default

- **WHEN** `a11yFallback` is omitted
- **THEN** no native select or hidden form control is rendered

#### Scenario: Fallback without selection is ignored

- **WHEN** `a11yFallback` is enabled while `selectionMode="none"` and the build is not production
- **THEN** no fallback select is rendered and a development warning explains that a selection mode is required

### Requirement: Built-in motion respects prefers-reduced-motion

Every built-in animation or transition MUST be disabled or reduced when the user prefers reduced motion. Today the tooltip fade is the only built-in motion and MUST become instantaneous under `prefers-reduced-motion: reduce`; the change MUST leave normal-motion behavior unchanged. Any future built-in data transition added to the component MUST follow the same rule.

#### Scenario: Reduced motion disables the tooltip fade

- **WHEN** the map is rendered with `showTooltip` and the user agent matches `prefers-reduced-motion: reduce`
- **THEN** the tooltip does not play the fade animation

#### Scenario: Normal motion is unchanged

- **WHEN** reduced motion is not requested
- **THEN** the existing tooltip fade behavior is preserved

### Requirement: The supported states pass automated accessibility checks

The rendered map MUST produce no axe violations in `"none"`, `"single"`, and `"multiple"` modes, with the fallback enabled or disabled, and with disabled provinces present. The project MUST include an automated accessibility test that fails when a supported state introduces an axe violation.

#### Scenario: Axe passes in every supported mode

- **WHEN** the automated accessibility test renders none, single, and multiple modes
- **THEN** axe reports zero violations for each render

#### Scenario: Axe passes with the fallback and disabled provinces

- **WHEN** the accessibility test renders `a11yFallback` and disabled provinces in a selection mode
- **THEN** axe reports zero violations

### Requirement: Accessibility additions remain backward compatible

The change MUST keep all existing props, callbacks, legacy DOM ids, and `<TurkeyMap />` behavior available without consumer migration. New props and style fields MUST be optional. Runtime dependencies MUST remain zero, React and React DOM MUST stay peer dependencies supporting `>=16.8`, and the feature MUST NOT require APIs unavailable in React 16.8. The one intentional keyboard behavior change in `"none"` mode MUST be documented in the readme.

#### Scenario: Existing usage still renders

- **WHEN** a consumer renders `<TurkeyMap />` or supplies only existing props
- **THEN** the map renders and all existing pointer callbacks and legacy ids keep working

#### Scenario: New customization is optional

- **WHEN** a consumer omits `ariaLabel`, `a11yFallback`, `focusStroke`, and `focusStrokeWidth`
- **THEN** the component uses documented defaults and existing `CustomStyleType` objects keep type-checking

#### Scenario: No runtime dependency is added

- **WHEN** the published package is inspected
- **THEN** it still has no runtime dependencies and declares React as a peer dependency
