## ADDED Requirements

### Requirement: The zoomable viewport is an accessible, labeled focus target

When `zoomable` is `true`, the root SVG SHALL be focusable and MUST expose an accessible name that identifies the map and communicates the available zoom and pan keys. The accessible name MUST default to a description containing the map's existing accessible name and the `+`, `-`, arrow-key, and `0` shortcuts, and consumer-supplied `svgProps` accessible names or descriptions MUST take precedence. Enabling the feature MUST add at most one viewport tab stop and MUST NOT remove any existing province from the roving tab order or change province roles, names, or states.

#### Scenario: Viewport has an accessible name

- **WHEN** a zoomable map is rendered
- **THEN** the SVG viewport is focusable and exposes an accessible name describing the map and its zoom/pan keys

#### Scenario: Consumer labeling wins

- **WHEN** `svgProps={{ "aria-label": "Custom map" }}` is supplied with `zoomable`
- **THEN** the custom accessible name is used and the default viewport description does not replace it

#### Scenario: Province semantics are unchanged

- **WHEN** a zoomable map renders in a selection mode
- **THEN** the province container, province roles, accessible names, `aria-selected`, `aria-disabled`, and roving tab stop behave exactly as before

#### Scenario: Only one extra tab stop is added

- **WHEN** `zoomable` is `true` and no zoom controls are rendered
- **THEN** exactly one additional focusable element, the SVG viewport, is added to the page

### Requirement: Zoom controls expose accessible names, states, and focus

When `zoomControls` renders buttons, each button SHALL have a descriptive accessible name, MUST expose its disabled state when a zoom bound or the reset position is reached, MUST be operable with Enter and Space, and MUST show a visible focus indicator. The group containing the controls MUST have an accessible name. The controls MUST NOT introduce interactive descendants inside the map's province listbox or alter the province keyboard model.

#### Scenario: Controls are named

- **WHEN** zoom controls are rendered
- **THEN** the control group and each button have accessible names that describe zoom in, zoom out, and reset

#### Scenario: Disabled controls are announced

- **WHEN** the viewport reaches `maxZoom`
- **THEN** the zoom-in button is disabled and exposes that state to assistive technology

#### Scenario: Controls are keyboard operable

- **WHEN** a zoom-control button has focus and the user presses Enter or Space
- **THEN** the corresponding viewport action runs exactly once

#### Scenario: Control focus is visible

- **WHEN** a zoom-control button receives keyboard focus
- **THEN** a visible focus indicator is rendered

### Requirement: Zoom keyboard shortcuts do not replace province keyboard navigation

In a zoomable map, viewport shortcuts MUST be handled only when the SVG viewport itself is focused. Province key handling MUST remain authoritative for key presses originating from a province, including arrow navigation, Home/End, Enter/Space activation, and Escape clearing. Disabled provinces MUST keep their existing discoverability and inert activation. The live-region announcements for focus and selection MUST remain unchanged.

#### Scenario: Arrow keys move provinces when a province is focused

- **WHEN** a province has focus in a zoomable map and the user presses an arrow key
- **THEN** focus moves to the adjacent province and the viewport does not pan

#### Scenario: Escape still clears selection

- **WHEN** a province has focus in a zoomable selection map and the user presses Escape
- **THEN** the selection clears through the existing behavior

#### Scenario: Focus announcements are preserved

- **WHEN** a province receives focus in a zoomable map
- **THEN** the existing live-region announcement for its name and state is produced

#### Scenario: Disabled provinces stay inert

- **WHEN** a disabled province receives focus in a zoomable map and the user presses Enter or Space
- **THEN** no selection or activation occurs, matching the existing disabled behavior
