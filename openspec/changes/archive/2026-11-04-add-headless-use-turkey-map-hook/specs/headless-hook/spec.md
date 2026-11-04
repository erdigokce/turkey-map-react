## Purpose

Lets consumers reuse the map's selection, keyboard, focus, announcement, disabled-state, and tooltip behavior while rendering their own SVG or non-SVG markup, with full TypeScript generics for custom city metadata.

## ADDED Requirements

### Requirement: The hook is rendering-free, dataset-free, and SSR-safe

The package SHALL export `useTurkeyMap` from both `turkey-map-react` and `turkey-map-react/core`. The hook MUST render no elements and MUST accept a required `data` option; it MUST NOT import, reference, or fall back to the built-in 81-province dataset. Calling the hook, including during server rendering, MUST NOT access `document` or `window` during render and MUST NOT throw when those globals are absent. The hook MUST use only React APIs available in React 16.8 and MUST NOT add a runtime dependency.

#### Scenario: The hook returns state without rendering markup

- **WHEN** a consumer calls `useTurkeyMap({ data })` inside a component
- **THEN** the call returns the hook result and renders no map markup by itself

#### Scenario: The hook renders only supplied data

- **WHEN** custom `data` is supplied to the hook
- **THEN** the hook result only contains cities from that data and the built-in dataset is not used

#### Scenario: Data is required

- **WHEN** a TypeScript consumer calls `useTurkeyMap` without `data`
- **THEN** the consumer's type-check fails

#### Scenario: Server rendering is safe

- **WHEN** the hook is called in an environment without `document` or `window`
- **THEN** it does not throw and does not access those globals during render

### Requirement: The hook exposes selection state and actions

The hook SHALL expose the effective selection as `selectedCities` (`TCity[]`) and `selectedIds` (`string[]`), in first-occurrence order. It MUST support the same `"none"`, `"single"`, and `"multiple"` modes, controlled and uncontrolled values, `maxSelection`, callback semantics, disabled cities, and development diagnostics as the rendered component. It SHALL expose actions to activate a city, apply a selection value from city ids, and clear the selection. Unknown ids MUST NOT throw; they MUST be ignored visually and omitted from `TCity[]` callbacks.

#### Scenario: Single selection replaces the previous city

- **WHEN** the hook uses `selectionMode: "single"` and two cities are activated in turn
- **THEN** `selectedCities` contains only the second city and `onSelectionChange` reports only that city

#### Scenario: Multiple selection toggles and respects the cap

- **WHEN** the hook uses `selectionMode: "multiple"` with `maxSelection: 2`
- **THEN** activating unselected cities adds them up to the cap, activating a selected city removes it, and an addition beyond the cap is ignored with `onMaxSelectionReached` or a development warning

#### Scenario: Controlled values remain authoritative

- **WHEN** a controlled `selectedCity` or `selectedCities` value is supplied
- **THEN** `selectedCities` reflects that value and interactions only report changes through `onSelectionChange` until the parent updates the value

#### Scenario: Clearing a selection

- **WHEN** `clearSelection()` is called while a selection exists
- **THEN** the effective selection becomes empty and `onSelectionChange` receives an empty array
- **AND** `onSelect` does not fire

#### Scenario: Applying a selection value

- **WHEN** `changeSelection(ids)` is called with multiple ids in multiple mode
- **THEN** the hook applies the same normalization, cap, callback, and announcement rules as the rendered component's native-select fallback

#### Scenario: None mode has no selection

- **WHEN** `selectionMode` is `"none"` or omitted
- **THEN** `selectedCities` is empty, selection actions do not create a selection, and `onClick` still fires for activations

#### Scenario: Unknown ids are tolerated

- **WHEN** a controlled selection or `changeSelection` call contains an id that is not in `data`
- **THEN** the hook does not throw and omits that id from `TCity[]` callbacks

### Requirement: The hook exposes container ARIA props

The hook SHALL provide `getContainerProps()`, which returns the attributes for the element that contains the cities. In `"single"` and `"multiple"` modes the props MUST include `role="listbox"`; in `"none"` mode they MUST include `role="group"`. The props MUST include the accessible name from `ariaLabel`, defaulting to `"Turkey map"`, and MUST include `aria-multiselectable="true"` only in multiple mode. Applying these props MUST NOT render an element or change the consumer's tag choice.

#### Scenario: Single mode is a single-select listbox

- **WHEN** `getContainerProps()` is read with `selectionMode: "single"`
- **THEN** it returns `role="listbox"`, the accessible name, and no multiselectable claim

#### Scenario: Multiple mode is a multiselect listbox

- **WHEN** `getContainerProps()` is read with `selectionMode: "multiple"`
- **THEN** it returns `role="listbox"` and `aria-multiselectable="true"`

#### Scenario: None mode is a labeled group

- **WHEN** `getContainerProps()` is read with `selectionMode: "none"` or no mode
- **THEN** it returns `role="group"` and the same accessible name

#### Scenario: The accessible name can be localized

- **WHEN** `ariaLabel="Türkiye haritası"` is supplied
- **THEN** the container props use that name instead of the default

### Requirement: The hook exposes per-city props and interaction handlers

The hook SHALL provide `getCityProps(city)`, which returns the attributes and handlers for the element that represents one city. The props MUST include an accessible name in the form `"<name>, plate <plateNumber>"`, `role="option"` with `aria-selected` in selection modes, or `role="button"` without `aria-selected` in `"none"` mode. Disabled cities MUST include `aria-disabled="true"` and MUST remain named. Pointer activation MUST call `onClick` and apply the same selection behavior as the component; hovering MUST call `onHover` when hoverable; disabled cities MUST NOT fire activation or hover callbacks. The props MUST work when applied to an SVG element or an HTML element and MUST NOT depend on the hook rendering the element.

#### Scenario: City props expose the accessible name and state

- **WHEN** `getCityProps(city)` is read in multiple mode
- **THEN** it returns `role="option"`, the `"<name>, plate <plateNumber>"` name, and `aria-selected` reflecting the effective selection

#### Scenario: None mode uses buttons

- **WHEN** `getCityProps(city)` is read with `selectionMode: "none"`
- **THEN** it returns `role="button"` and no `aria-selected`

#### Scenario: Disabled cities are inert

- **WHEN** `getCityProps(city)` is read for a disabled city
- **THEN** it includes `aria-disabled="true"`, keeps the accessible name, and its activation and hover handlers do not call callbacks

#### Scenario: Clicking a city selects and reports it

- **WHEN** the consumer applies `getCityProps(city)` to an element and the user clicks that element in single or multiple mode
- **THEN** the selection actions run and `onClick` fires with the same city object from `data`

#### Scenario: Hovering reports the city

- **WHEN** the consumer applies `getCityProps(city)` to an element and the user hovers it while `hoverable` is true
- **THEN** `onHover` fires with the same city object from `data`

### Requirement: The hook provides roving keyboard navigation and focus

The hook SHALL make exactly one city tabbable and all others non-tabbable, using `tabIndex` in `getCityProps`. The roving city MUST default to the first selected city in data order, otherwise the first enabled city, otherwise the first city. ArrowRight/ArrowDown, ArrowLeft/ArrowUp, Home, and End MUST move focus between cities in data order without wrapping, and Enter/Space MUST activate the focused city using the same behavior as a pointer click. Escape MUST clear the selection without firing `onSelect` and without firing `onSelectionChange` when already empty. Disabled cities MUST stay in the navigation order and MUST remain inert on activation. Keyboard focus movement MUST move focus to the actual city element selected by the hook.

#### Scenario: Only one city is tabbable

- **WHEN** the hook is used with multiple cities
- **THEN** exactly one city's props have `tabIndex={0}` and the others have `tabIndex={-1}`

#### Scenario: Arrow keys move focus

- **WHEN** a city has focus and the user presses ArrowRight, ArrowDown, ArrowLeft, or ArrowUp
- **THEN** focus moves to the next or previous city in data order and the roving tab stop follows

#### Scenario: Home and End reach the boundaries

- **WHEN** a city has focus and the user presses Home or End
- **THEN** focus moves to the first or last city and navigation clamps rather than wrapping

#### Scenario: Enter and Space activate

- **WHEN** a city has focus in a selection mode and the user presses Enter or Space
- **THEN** the city is selected or toggled exactly as a click would do

#### Scenario: Escape clears

- **WHEN** a selection exists and the user presses Escape
- **THEN** the selection clears and `onSelectionChange` receives an empty array
- **AND** `onSelect` does not fire

#### Scenario: Disabled cities stay discoverable

- **WHEN** keyboard navigation reaches a disabled city
- **THEN** focus moves to it and Enter or Space performs no activation

#### Scenario: The roving stop repairs itself

- **WHEN** the current roving city disappears from `data`
- **THEN** another rendered city becomes the tab stop

### Requirement: The hook exposes live-region announcement state

The hook SHALL expose an `announcement` string suitable for a consumer-rendered visually hidden live region. It MUST announce the focused city's accessible name, including selected and disabled state when applicable, and MUST announce selection changes and clearing once per change. Pointer hover and unrelated re-renders MUST NOT change the announcement.

#### Scenario: Focus is announced

- **WHEN** focus moves to a city
- **THEN** `announcement` contains that city's name and plate number

#### Scenario: Selection is announced

- **WHEN** a city is selected, deselected, or cleared
- **THEN** `announcement` reflects the resulting selection state once

#### Scenario: Hover is not announced

- **WHEN** the pointer hovers a city without focus or selection changing
- **THEN** `announcement` does not change

### Requirement: The hook exposes optional tooltip state and props

When `showTooltip` is `true`, the hook SHALL track the hovered or focused city and expose `tooltipCity` and `tooltipVisible`, plus `getTooltipProps()`. The tooltip props MUST include `role="tooltip"`, `aria-hidden="true"` while hidden and no hidden state while visible, and inline positioning styles for the configured `tooltipPosition`, `tooltipOffset`, and `tooltipDelay`. Cursor anchoring MUST preserve the component's displacement rules; city anchoring MUST center above the city element. The hook MUST NOT render tooltip content or a portal; consumers render the content and decide where it lives. When `showTooltip` is false or omitted, the hook MUST NOT add tooltip behavior. Reduced-motion preferences MUST suppress the fade where an animation name is configured, and environments without `matchMedia` MUST hide without depending on an animation. Tooltip state MUST NOT change `onSelect`, `onSelectionChange`, `onClick`, or `onHover` behavior.

#### Scenario: Tooltip is opt-in

- **WHEN** `showTooltip` is false or omitted
- **THEN** `tooltipCity` is undefined, `tooltipVisible` is false, and hovering does not create tooltip state

#### Scenario: Hover reveals the tooltip

- **WHEN** `showTooltip` is true, the pointer enters a city, and the hover-intent delay elapses
- **THEN** `tooltipVisible` becomes true, `tooltipCity` is that city, and the tooltip props are exposed to assistive technology

#### Scenario: Tooltip follows the configured anchor

- **WHEN** `tooltipPosition` is `"cursor"` or `"city"`
- **THEN** the tooltip props position the tooltip at the pointer offset or above and centered on the city element respectively

#### Scenario: Leaving hides the tooltip

- **WHEN** the pointer or focus leaves the city and no other city is active
- **THEN** the tooltip becomes hidden and its props report `aria-hidden="true"`

#### Scenario: Tooltip does not capture the pointer

- **WHEN** the consumer applies the tooltip props to the tooltip element
- **THEN** the props keep the tooltip from intercepting pointer events on the map

#### Scenario: No matchMedia support

- **WHEN** `window.matchMedia` is unavailable
- **THEN** the tooltip hides without throwing and without depending on an animation

### Requirement: The hook preserves custom city metadata through generics

The hook and the shared public types SHALL be generic over a city subtype that extends `CityType`. The generic parameter MUST flow through `data`, `getCityProps`, `selectedCities`, `onHover`, `onClick`, `onSelect`, `onSelectionChange`, `onMaxSelectionReached`, `isCityDisabled`, and any hook-provided city state. Custom metadata on those city objects MUST be preserved by identity and visible in the typed results. Omitting the type parameter MUST default to `CityType` so existing TypeScript code keeps compiling.

#### Scenario: Custom metadata reaches callbacks

- **WHEN** a consumer defines `type City = CityType & { region: string }` and calls `useTurkeyMap<City>({ data })`
- **THEN** `selectedCities` and the selection callbacks expose `region` on each city

#### Scenario: Custom metadata reaches city props

- **WHEN** `getCityProps(customCity)` is read for a generic city
- **THEN** the function accepts that city type and returns props for the same city

#### Scenario: Existing types still compile

- **WHEN** a consumer imports `CityType`, `Data`, `OnSelectCallback`, or the other existing aliases without type arguments
- **THEN** they resolve with `CityType` defaults as before

### Requirement: The hook and the rendered component share one behavior contract

`TurkeyMap` MUST consume the same interaction engine as the hook. With no new props, the component's rendered markup, legacy DOM ids, `data-*` attributes, callbacks, selection behavior, accessibility semantics, tooltip behavior, and render isolation MUST remain unchanged. The hook MUST produce the same effective selection, roving focus, announcements, and tooltip state that the component uses for the same options.

#### Scenario: Default component output is unchanged

- **WHEN** `<TurkeyMap />` renders on the client or server
- **THEN** it contains the same province groups, legacy ids, `data-*` attributes, and snapshots as before this change

#### Scenario: Component and hook agree on selection

- **WHEN** the component and a headless consumer use the same data, mode, and controlled value
- **THEN** both report the same selected ids and invoke the same callbacks for the same interaction

#### Scenario: Render isolation is preserved

- **WHEN** a pointer enters one province or the selection changes for one province
- **THEN** only the affected province components re-render, as specified by the `province-rendering` capability

#### Scenario: Existing tests and budgets pass

- **WHEN** `npm run verify` runs after the refactor
- **THEN** the existing test suites pass, coverage thresholds hold, the core entry stays under its gzip budget, and no runtime dependency is added

### Requirement: The hook API is typed and documented

The hook options, result, prop-getter return types, and generic city type MUST be exported from the package root and `core` entries. The readme MUST include a working headless example, and the API reference MUST document the hook options, result fields, prop getters, and generic usage. The documentation MUST state that the hook renders nothing, that consumers own markup, styling, tooltip content, and portals, and that `data` is required.

#### Scenario: Types are exported

- **WHEN** a TypeScript consumer imports the hook and its option/result types from either entry point
- **THEN** the imports resolve without a missing-module or missing-type error

#### Scenario: The readme contains a headless example

- **WHEN** a consumer reads the readme's headless section
- **THEN** it shows `useTurkeyMap` with `getContainerProps`, `getCityProps`, and `getTooltipProps` rendered into consumer-owned markup

#### Scenario: The API reference covers the hook

- **WHEN** a consumer reads the API reference
- **THEN** it documents every hook option, result field, prop getter, and the custom-metadata generic
