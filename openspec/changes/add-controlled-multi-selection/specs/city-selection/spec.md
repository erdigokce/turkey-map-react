## Purpose

Lets consumers use the map as a single- or multi-select province control with controlled or uncontrolled state, form-friendly primitive values, selection limits, and a declarative selected visual state that survives re-renders.

## ADDED Requirements

### Requirement: Selection modes are opt-in

The component SHALL expose `selectionMode` with the values `"none"`, `"single"`, and `"multiple"`, defaulting to `"none"`. Selection behavior and selection callbacks MUST be inactive in `"none"` mode. Enabling a selection mode MUST NOT disable `onClick` or `onHover`.

#### Scenario: Default map is unchanged

- **WHEN** `<TurkeyMap />` is rendered without selection props
- **THEN** no city is selected, no selection callbacks fire, and `onClick` and `onHover` behave exactly as before

#### Scenario: Selection props without a mode are inactive

- **WHEN** selection props are supplied while `selectionMode` is `"none"` or omitted
- **THEN** the map renders as before, ignores those selection props, and emits a development warning explaining that a selection mode is required

#### Scenario: Clicking still reports in selection mode

- **WHEN** a user clicks a city while `selectionMode` is `"single"` or `"multiple"`
- **THEN** `onClick` fires with the full `CityType` in addition to any selection callbacks

### Requirement: Selection identity and value shape

Selection values MUST be city `id` strings. The controlled single value MUST accept a city id or `null` to represent no selection. The controlled multiple value MUST accept an array of city ids, with an empty array representing no selection. Duplicate ids in an input array MUST be collapsed so each city appears at most once. Unknown ids MUST NOT throw; they MUST be ignored visually and omitted from `CityType[]` callbacks.

#### Scenario: Single value is a city id or null

- **WHEN** `selectedCity="istanbul"` is supplied in single mode
- **THEN** the city whose `id` is `"istanbul"` renders as selected
- **AND** `selectedCity={null}` clears the visible selection

#### Scenario: Multiple value is a de-duplicated id array

- **WHEN** `selectedCities={["ankara", "istanbul", "ankara"]}` is supplied in multiple mode
- **THEN** Ankara and İstanbul render as selected
- **AND** callbacks report each city once in first-occurrence order

#### Scenario: Unknown ids are tolerated

- **WHEN** a selection value contains an id that does not exist in the rendered city data
- **THEN** rendering does not throw, no city is marked selected for that id, and `CityType[]` callbacks omit it

### Requirement: Controlled and uncontrolled selection

The component SHALL support controlled single selection with `selectedCity`, uncontrolled single selection with `defaultSelectedCity`, controlled multiple selection with `selectedCities`, and uncontrolled multiple selection with `defaultSelectedCities`. Controlled values MUST win when both controlled and uncontrolled props for the same mode are supplied, and a development warning MUST identify the conflict. A controlled value that is present but empty (`null` or `[]`) MUST remain controlled and clear the selection.

#### Scenario: Controlled value wins

- **WHEN** `selectedCity="ankara"` and `defaultSelectedCity="istanbul"` are supplied
- **THEN** Ankara is selected
- **AND** a development warning reports that the controlled prop took precedence

#### Scenario: Controlled updates re-render the selection

- **WHEN** the parent changes `selectedCities` from `["ankara"]` to `["istanbul", "izmir"]`
- **THEN** the re-rendered map shows exactly İstanbul and İzmir as selected

#### Scenario: Uncontrolled selection updates itself

- **WHEN** no controlled prop is supplied and the user selects a city
- **THEN** the component updates its own selection and calls `onSelectionChange`
- **AND** the selected state survives unrelated re-renders of the parent

#### Scenario: Defaults initialize only on mount

- **WHEN** `defaultSelectedCities` changes after the component has mounted
- **THEN** the already-mounted uncontrolled selection is not reset by the new default

### Requirement: Single selection behavior

In `"single"` mode, activating a city SHALL select exactly that city and replace any previous selection. Activating the already-selected city SHALL leave the selection unchanged. A single selection MUST never contain more than one city.

#### Scenario: Selecting a second city replaces the first

- **WHEN** Ankara is selected and the user activates İstanbul
- **THEN** only İstanbul remains selected
- **AND** `onSelectionChange` receives only İstanbul

#### Scenario: Re-activating the selected city is idempotent

- **WHEN** the user activates the city that is already selected
- **THEN** the selection remains that city and `onSelectionChange` does not fire again

#### Scenario: Single mode ignores multiple-style limits

- **WHEN** `maxSelection` is supplied in single mode
- **THEN** the limit has no effect because single mode can never hold more than one city

### Requirement: Multiple selection and `maxSelection`

In `"multiple"` mode, activating an unselected city SHALL add it to the selection and activating a selected city SHALL remove it. A positive integer `maxSelection` MUST cap the number of selected cities. An attempt to add a city beyond the cap MUST be ignored: the selection MUST remain unchanged and `onSelectionChange` MUST NOT fire. Removing a city MUST always be allowed. Non-positive or non-integer `maxSelection` values MUST be ignored with a development warning.

#### Scenario: Toggling a city off

- **WHEN** Ankara is selected in multiple mode and the user activates Ankara again
- **THEN** Ankara is no longer selected
- **AND** `onSelectionChange` receives the remaining selection

#### Scenario: Selection beyond the cap is ignored

- **WHEN** `maxSelection={2}` and two cities are selected
- **AND** the user activates a third city
- **THEN** the first two cities remain selected and the third is not added
- **AND** `onSelectionChange` does not fire

#### Scenario: Custom overflow handler

- **WHEN** `onMaxSelectionReached` is supplied and a user attempts to exceed `maxSelection`
- **THEN** the handler receives the attempted city, the current `CityType[]` selection, and the limit
- **AND** the default development warning is not emitted

#### Scenario: Default overflow warning

- **WHEN** no `onMaxSelectionReached` is supplied, the cap is reached, and the build is not production
- **THEN** a `console.warn` explains that the maximum selection was reached

#### Scenario: Removing at the cap

- **WHEN** the selection is at `maxSelection` and the user activates a selected city
- **THEN** that city is removed and the selection shrinks below the cap

#### Scenario: Invalid limit

- **WHEN** `maxSelection` is zero, negative, or not an integer
- **THEN** no limit is applied and a development warning identifies the invalid value

### Requirement: Selection callbacks expose full city data

The component SHALL expose `onSelect` and `onSelectionChange`. `onSelect` MUST receive the full `CityType` whenever an activation selects a city. `onSelectionChange` MUST receive the complete current selection as `CityType[]` whenever the selection set changes, using first-occurrence order. `onSelectionChange` MUST receive an array in every mode, including zero or one item in single mode. Deselecting a city in multiple mode MUST NOT fire `onSelect`. Both callbacks MUST receive the same city objects that were supplied through `data`, and MUST use the latest callback references after a re-render.

#### Scenario: Selecting reports the full city

- **WHEN** the user activates Ankara
- **THEN** `onSelect` receives the exact Ankara object from `data`
- **AND** `onSelectionChange` receives an array containing that object

#### Scenario: Deselecting only reports the selection change

- **WHEN** the user removes a selected city in multiple mode
- **THEN** `onSelectionChange` fires with the new array
- **AND** `onSelect` does not fire

#### Scenario: Latest callbacks are used

- **WHEN** the parent replaces a selection callback after a re-render
- **THEN** the next interaction calls the new callback and not the old one

### Requirement: Selected state is declarative and distinct from hover

Selected state MUST be derived from component props/state rather than direct DOM mutation, and MUST remain applied across re-renders, `customStyle` changes, and data updates. Selected styling MUST take precedence over hover styling. `customStyle` SHALL gain optional `selectedColor`, `selectedStroke`, and `selectedStrokeWidth` fields whose omission preserves the current visual output when nothing is selected. Hovering a selected city MUST NOT remove its selected styling.

#### Scenario: Selection survives a re-render

- **WHEN** a city is selected and the parent re-renders with unrelated prop changes
- **THEN** the city still renders with selected styling

#### Scenario: Selected and hover are separate

- **WHEN** an unselected city is hovered, then a selected city is hovered
- **THEN** the unselected city uses hover styling and the selected city keeps selected styling

#### Scenario: Deselect restores idle styling

- **WHEN** a selected city is deselected while not hovered
- **THEN** it renders with the idle styling

#### Scenario: Custom selected colors are applied

- **WHEN** `customStyle` supplies `selectedColor`, `selectedStroke`, and `selectedStrokeWidth`
- **THEN** selected cities render those values while unselected cities keep their existing styling

### Requirement: Keyboard selection

When a selection mode is active, city elements MUST be keyboard focusable, MUST show a visible focus indicator, and MUST select on Enter or Space using the same behavior as a pointer activation. When `selectionMode` is `"none"`, no additional keyboard stops or selection behavior SHALL be added. Full roving tabindex, listbox/option roles, `aria-live`, and the accessibility audit are outside this change.

#### Scenario: Enter selects

- **WHEN** a city is focused in single or multiple mode and the user presses Enter
- **THEN** the same selection behavior as a click occurs and the appropriate callbacks fire

#### Scenario: Space selects

- **WHEN** a city is focused in multiple mode and the user presses Space
- **THEN** the city toggles selected state

#### Scenario: No keyboard stops without selection

- **WHEN** `selectionMode` is `"none"`
- **THEN** city elements are not added as keyboard tab stops by this feature

#### Scenario: Focus is visible

- **WHEN** a city receives keyboard focus in a selection mode
- **THEN** a visible focus indicator is rendered

### Requirement: Compatibility and development diagnostics

The change MUST remain backward compatible: existing props, defaults, callbacks, DOM ids, and `CustomStyleType` consumers MUST keep working, and new `customStyle` fields MUST be optional. Development-only diagnostics MUST cover conflicting controlled/uncontrolled props, selection props without a mode, invalid `maxSelection`, and selection values that exceed `maxSelection`. Production builds MUST NOT emit these warnings.

#### Scenario: Existing custom style objects still type-check

- **WHEN** an existing consumer supplies only `idleColor` and `hoverColor`
- **THEN** the component accepts the object and keeps the current default appearance

#### Scenario: Production is quiet

- **WHEN** `NODE_ENV` is `"production"` and a diagnostic condition occurs
- **THEN** no selection warning is written to the console

#### Scenario: Controlled value exceeds the cap

- **WHEN** a controlled selection contains more cities than `maxSelection`
- **THEN** the provided controlled selection is rendered as supplied
- **AND** a development warning explains that `maxSelection` is not enforced on controlled values
