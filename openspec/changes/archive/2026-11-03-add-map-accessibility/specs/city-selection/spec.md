## MODIFIED Requirements

### Requirement: Keyboard selection

When a selection mode is active, city elements MUST participate in the map's roving tabindex: exactly one province is tabbable, Arrow keys and Home/End move focus, and focus MUST be visible. Enter or Space MUST select or toggle the focused city using the same behavior as pointer activation, and MUST NOT select when the province is disabled. Escape MUST clear the current selection without firing `onSelect`; clearing an already-empty selection MUST NOT fire `onSelectionChange`. In controlled mode Escape only reports the change through `onSelectionChange`, and the parent remains responsible for updating the controlled value. In `"none"` mode, Enter or Space on the focused province MUST invoke `onClick` with that city and MUST NOT create or change any selection. The full roving model, roles, live region, focus-ring customization, and native-select fallback are specified by the `accessibility` capability.

#### Scenario: Enter selects

- **WHEN** a city is focused in single or multiple mode and the user presses Enter
- **THEN** the same selection behavior as a click occurs and the appropriate callbacks fire

#### Scenario: Space selects

- **WHEN** a city is focused in multiple mode and the user presses Space
- **THEN** the city toggles selected state

#### Scenario: Escape clears a single selection

- **WHEN** a city is selected in single mode and the user presses Escape
- **THEN** the visible selection clears and `onSelectionChange` receives an empty array
- **AND** `onSelect` does not fire

#### Scenario: Escape clears a multiple selection

- **WHEN** several cities are selected in multiple mode and the user presses Escape
- **THEN** all cities are cleared and `onSelectionChange` receives an empty array
- **AND** `onSelect` does not fire

#### Scenario: Escape on an empty selection is inert

- **WHEN** no city is selected and the user presses Escape
- **THEN** the selection stays empty and `onSelectionChange` does not fire

#### Scenario: Controlled Escape reports but does not mutate the parent value

- **WHEN** a controlled selection is active and the user presses Escape
- **THEN** `onSelectionChange` receives an empty array
- **AND** the rendered selection changes only after the parent supplies the cleared value

#### Scenario: None mode activates through onClick

- **WHEN** `selectionMode="none"` and the user presses Enter or Space on a focused province
- **THEN** `onClick` fires with that city and no selection callback fires

#### Scenario: Disabled activation stays inert

- **WHEN** a focused disabled province receives Enter or Space
- **THEN** no selection or activation callback fires

#### Scenario: Focus is visible

- **WHEN** a city receives keyboard focus in any mode
- **THEN** a visible focus indicator is rendered
