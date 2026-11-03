## Purpose

Lets consumers mark provinces as unavailable so they still render and remain discoverable (visually and to assistive technology) while refusing pointer and keyboard activation and staying compatible with selection and custom data.

## ADDED Requirements

### Requirement: Disabled provinces can be declared through three additive sources

The component SHALL accept `disabledCities?: string[]` containing city `id`s, an optional per-city `disabled?: boolean` on `CityType` entries supplied through `data`, and `isCityDisabled?: (city: CityType) => boolean`. A city MUST render as disabled when any of these sources marks it disabled; the sources are additive, not overriding. Unknown ids in `disabledCities` MUST NOT throw and MUST be ignored. Duplicate ids in `disabledCities` MUST NOT change behavior.

#### Scenario: Disabled by id list

- **WHEN** `disabledCities={["hakkari", "sirnak"]}` is supplied with the built-in data
- **THEN** Hakkâri and Şırnak render as disabled and every other province is unaffected

#### Scenario: Disabled by predicate with custom data

- **WHEN** custom `data` is supplied and `isCityDisabled={(city) => city.name === "Alpha"}` returns `true` for one entry
- **THEN** that custom province renders as disabled even though it is absent from the built-in dataset

#### Scenario: Disabled by per-city data flag

- **WHEN** a `data` entry supplies `disabled: true`
- **THEN** that province renders as disabled without any additional prop

#### Scenario: Sources are additive

- **WHEN** a city is flagged `disabled: true` in `data` but `isCityDisabled` returns `false` for it
- **THEN** the city still renders as disabled because at least one source disabled it

#### Scenario: Unknown ids are tolerated

- **WHEN** `disabledCities` contains an id that does not exist in the rendered data
- **THEN** rendering does not throw and no province is disabled by that id

#### Scenario: Nothing disabled by default

- **WHEN** `<TurkeyMap />` is rendered without disabled-related props and without disabled data entries
- **THEN** no province renders as disabled and the default output is unchanged

### Requirement: Disabled provinces remain rendered with distinct visual styling

A disabled province MUST still be rendered in the map and MUST NOT be hidden or removed from the DOM. Its path MUST use the disabled fill instead of idle, hover, or selected fills. The cursor MUST indicate that interaction is unavailable. `customStyle` SHALL gain an optional `disabledColor` field; omitting it MUST apply a documented default and MUST NOT change the appearance of enabled provinces. Disabled styling MUST be derived declaratively and MUST survive re-renders.

#### Scenario: Disabled color is applied

- **WHEN** `customStyle={{ idleColor, hoverColor, disabledColor: "#e5e5e5" }}` is supplied
- **THEN** disabled provinces render with `#e5e5e5` while enabled provinces keep their existing idle/hover/selected colors

#### Scenario: Default disabled color

- **WHEN** `customStyle` omits `disabledColor`
- **THEN** disabled provinces use a visibly distinct default disabled fill

#### Scenario: Hover does not highlight a disabled province

- **WHEN** the pointer moves over a disabled province
- **THEN** its fill stays the disabled fill instead of the hover color

#### Scenario: Disabled wins over selected

- **WHEN** a province is both selected and disabled
- **THEN** it renders with the disabled fill rather than the selected fill and selected stroke

#### Scenario: Disabled province is not hidden

- **WHEN** a province is disabled
- **THEN** its city group and path remain present in the rendered map and can be located by its existing DOM id and data attributes

#### Scenario: Disabled styling survives a re-render

- **WHEN** the parent re-renders with unrelated prop changes
- **THEN** disabled provinces keep the disabled fill and cursor

### Requirement: Disabled provinces emit no interaction callbacks

Pointer and keyboard interaction with a disabled province MUST NOT call `onHover`, `onClick`, `onSelect`, `onSelectionChange`, or any selection-limit callback. Activating a disabled province MUST leave the current selection unchanged, whether it is controlled or uncontrolled. Enabled provinces MUST keep their existing callback behavior.

#### Scenario: Clicking a disabled province is inert

- **WHEN** the user clicks a disabled province while `onClick` and `onSelect` are supplied
- **THEN** neither callback fires and the selection does not change

#### Scenario: Hovering a disabled province does not report hover

- **WHEN** the pointer moves over a disabled province while `onHover` is supplied
- **THEN** `onHover` does not fire

#### Scenario: Keyboard activation is inert

- **WHEN** a disabled province is focused in a selection mode and the user presses Enter or Space
- **THEN** the selection does not change and no selection callbacks fire

#### Scenario: Multiple selection is unchanged

- **WHEN** multiple cities are selected and the user clicks a disabled city
- **THEN** the previously selected cities remain selected and `onSelectionChange` does not fire

#### Scenario: Enabled neighbours are unaffected

- **WHEN** one province is disabled and a different enabled province is clicked or hovered
- **THEN** the enabled province reports `onClick` / `onHover` and selection exactly as before

### Requirement: Disabled state coexists with selection

Disabling a province MUST NOT mutate or clear an existing selection that contains it; the disabled style simply takes precedence and the controlled value remains authoritative. A city that becomes disabled MUST become non-interactive while disabled and MUST return to normal interaction when it is no longer disabled.

#### Scenario: A selected city becomes disabled

- **WHEN** a city is selected and the parent then includes it in `disabledCities`
- **THEN** it renders with disabled styling and remains in the supplied selection value
- **AND** no selection callback fires merely because it became disabled

#### Scenario: A disabled city is re-enabled

- **WHEN** a city is removed from `disabledCities` or the predicate starts returning `false` for it
- **THEN** it renders with normal styling and can be hovered, clicked, and selected again

#### Scenario: Controlled selection may include a disabled city

- **WHEN** a controlled selection value contains a disabled city
- **THEN** the controlled value is still rendered as supplied and is not silently filtered

### Requirement: Disabled provinces expose an accessible state

A disabled province MUST expose `aria-disabled="true"` on its focusable city element so assistive technology can announce it. Enabled provinces MUST NOT gain `aria-disabled="true"`. When a selection mode is active, disabled provinces MUST remain keyboard focusable and MUST show a visible focus indicator, but activation MUST be inert. In `"none"` mode this change MUST NOT add keyboard tab stops.

#### Scenario: Disabled state is announced

- **WHEN** a province is disabled
- **THEN** its city element has `aria-disabled="true"`

#### Scenario: Enabled state is unchanged

- **WHEN** a province is not disabled
- **THEN** it does not render `aria-disabled="true"`

#### Scenario: Disabled province is keyboard discoverable

- **WHEN** a selection mode is active and the user tabs to a disabled province
- **THEN** the province receives focus and a visible focus indicator

#### Scenario: Activation stays inert from the keyboard

- **WHEN** a focused disabled province receives Enter or Space
- **THEN** no selection or callback occurs

#### Scenario: No keyboard stop without selection

- **WHEN** `selectionMode` is `"none"` and a province is disabled
- **THEN** this feature does not add a keyboard tab stop to that province

### Requirement: Disabled tooltip text

When `showTooltip` is enabled and a disabled province is hovered, the built-in tooltip MUST display `disabledTooltipText` when supplied and MUST fall back to the city name otherwise. Tooltip behavior for enabled provinces MUST remain unchanged. Showing a tooltip for a disabled province MUST NOT re-enable any interaction callback.

#### Scenario: Custom disabled tooltip

- **WHEN** `showTooltip`, `disabledTooltipText="Not available"`, and a hover over a disabled province
- **THEN** the tooltip text is "Not available"

#### Scenario: Default disabled tooltip

- **WHEN** `showTooltip` is enabled, `disabledTooltipText` is omitted, and a disabled province is hovered
- **THEN** the tooltip shows the province name

#### Scenario: Enabled tooltip is unchanged

- **WHEN** `showTooltip` is enabled and an enabled province is hovered
- **THEN** the existing tooltip text behavior is preserved

### Requirement: Backward compatibility and public types

The change MUST remain backward compatible. `CityType` MUST keep all existing required fields and add `disabled` as optional, so existing datasets continue to type-check. `CustomStyleType` MUST add `disabledColor` as optional. Existing props, defaults, callbacks, DOM ids, and the `<TurkeyMap />` one-liner MUST keep working without consumer migration.

#### Scenario: Existing data still type-checks

- **WHEN** a consumer supplies `{ id, plateNumber, name, path }` entries without `disabled`
- **THEN** the component accepts the dataset and renders it normally

#### Scenario: Existing custom style still type-checks

- **WHEN** a consumer supplies only `idleColor` and `hoverColor`
- **THEN** the component accepts the object and keeps the existing appearance for enabled provinces
