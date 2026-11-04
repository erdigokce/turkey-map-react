## ADDED Requirements

### Requirement: Viewport changes do not re-render provinces

Changing the viewport scale or translation SHALL NOT re-render `Province` components whose city data, selected state, disabled state, focus state, and resolved style are unchanged. The viewport transform MUST be applied at a container level so zooming and panning move the rendered provinces without recreating them. This isolation MUST hold for wheel, pinch, drag, double-click, keyboard, zoom-control, and imperative ref changes.

#### Scenario: Wheel zoom does not re-render provinces

- **WHEN** the user zooms with the wheel on a zoomable map
- **THEN** the viewport transform updates and no province component re-renders

#### Scenario: Drag pan does not re-render provinces

- **WHEN** the user drags to pan a zoomed map
- **THEN** the viewport translation updates and no province component re-renders

#### Scenario: Ref methods do not re-render provinces

- **WHEN** `focusCity`, `zoomTo`, or `resetView` changes the viewport
- **THEN** no province component re-renders because of the viewport change

#### Scenario: Province interaction still isolates updates

- **WHEN** a zoomed map hovers, focuses, or selects a province
- **THEN** only the affected province re-renders, preserving the existing isolation requirements

#### Scenario: Zoom does not break interaction state

- **WHEN** the viewport changes while a province is selected, disabled, or hovered
- **THEN** that province keeps its current visual and interactive state
