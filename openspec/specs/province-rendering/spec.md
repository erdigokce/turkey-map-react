# province-rendering Specification

## Purpose

Keeps hover, focus, and selection updates scoped to the provinces they affect, so interacting with one province does not re-render all 81 and the map stays responsive as the feature set grows.

## Requirements

### Requirement: Hover rendering is isolated to affected provinces

When the pointer enters or leaves a province, only the province whose hover state changed MAY re-render. Other province subtrees MUST NOT re-render. Hover styling MUST still use `customStyle.hoverColor`, selected styling MUST still win over hover, disabled provinces MUST NOT receive hover styling, and hover MUST remain inactive when `hoverable` is `false`.

#### Scenario: Entering one province does not re-render all provinces

- **WHEN** the pointer enters a single province on a map with hover enabled
- **THEN** that province receives hover styling and the other province components do not re-render

#### Scenario: Leaving one province does not re-render all provinces

- **WHEN** the pointer leaves the hovered province
- **THEN** that province returns to idle styling and the other province components do not re-render

#### Scenario: Moving between provinces restores the previous one

- **WHEN** the pointer moves from province A to province B
- **THEN** A returns to idle styling, B receives hover styling, and no other province changes

#### Scenario: Hover rules are preserved

- **WHEN** a selected province or a disabled province is hovered
- **THEN** the selected province keeps selected styling, the disabled province keeps disabled styling, and the existing `hoverable` and `onHover` behavior is unchanged

### Requirement: Tooltip updates do not re-render every province

When the built-in tooltip is enabled, hover MAY update tooltip content and position at the parent level. That update MUST NOT cause province components whose props did not change to re-render. When the tooltip is disabled, hover MUST NOT require a parent state update solely for visual hover styling.

#### Scenario: Tooltip hover stays isolated

- **WHEN** `showTooltip` is enabled and the pointer moves over provinces
- **THEN** the tooltip content updates and unaffected province components do not re-render

#### Scenario: No tooltip means no hover state churn

- **WHEN** `showTooltip` is disabled and the pointer moves over a province
- **THEN** hover styling updates without a parent hover-state update that re-renders the province list

### Requirement: Selection rendering is isolated to changed provinces

Changing the selection SHALL re-render only the provinces whose selected state changed. Selecting or deselecting one province MUST NOT re-render the other 80. Controlled selection updates MUST re-render at most the provinces whose ids entered or left the selection. Selected styling, selected-over-hover precedence, and selection callbacks MUST remain unchanged.

#### Scenario: Selecting one province

- **WHEN** a user selects one province
- **THEN** that province re-renders with selected styling and the other province components do not re-render

#### Scenario: Deselecting one province

- **WHEN** a user deselects one province in multiple mode
- **THEN** that province re-renders with idle styling and the other province components do not re-render

#### Scenario: Controlled replacement

- **WHEN** a controlled selection changes from one set of ids to another
- **THEN** only the provinces whose selected state changed re-render

#### Scenario: Disabled and selection precedence is preserved

- **WHEN** a disabled province is also selected, or a selected province is hovered
- **THEN** disabled styling still wins over selected, selected still wins over hover, and no extra provinces re-render

### Requirement: Focus rendering is isolated to the focused province

In a selection mode, focusing or blurring a province SHALL re-render only the province that gained or lost focus. The visible focus indicator, tab behavior, and keyboard activation MUST remain unchanged. In `"none"` mode, this change MUST NOT add keyboard tab stops.

#### Scenario: Focus enters one province

- **WHEN** keyboard focus moves to a province in a selection mode
- **THEN** that province shows the focus indicator and the other province components do not re-render

#### Scenario: Focus leaves one province

- **WHEN** keyboard focus leaves that province
- **THEN** the focus indicator is removed and the other province components do not re-render

#### Scenario: No keyboard stops without selection

- **WHEN** `selectionMode` is `"none"`
- **THEN** no province becomes a keyboard tab stop because of this change

### Requirement: Province rendering is stable across callback replacement

Replacing interaction callbacks after a parent render MUST NOT invalidate the rendering of provinces whose data, selection, disabled state, and style did not change. The next interaction MUST use the latest callback reference. This applies to `onHover`, `onClick`, `onSelect`, `onSelectionChange`, `onMaxSelectionReached`, and `isCityDisabled`, and to `cityWrapper`.

#### Scenario: Replacing onHover

- **WHEN** the parent supplies a different `onHover` callback and re-renders without changing province data or selection
- **THEN** province components do not re-render and the next hover calls the new callback

#### Scenario: Replacing selection callbacks

- **WHEN** the parent supplies a different `onSelect` or `onSelectionChange` callback and re-renders
- **THEN** unaffected provinces do not re-render and the next activation calls the new callback

#### Scenario: Replacing isCityDisabled

- **WHEN** the parent supplies a different `isCityDisabled` function and re-renders
- **THEN** disabled styling and hover isolation update from the new function without re-rendering provinces whose resolved disabled state did not change

### Requirement: Province render isolation preserves existing output and behavior

The change MUST preserve the default rendered markup's observable behavior, legacy DOM ids, existing `data-*` attributes, SSR output, event callbacks, selection behavior, disabled behavior, tooltip behavior, and custom styles. Data changes MUST re-render only the provinces whose city entries changed. A `customStyle` color change MAY re-render provinces because their visual inputs changed. Hover and focus state MUST remain local to each province and MUST NOT leak from one province to another.

#### Scenario: Default render is unchanged

- **WHEN** `<TurkeyMap />` renders on the server or client
- **THEN** it still contains the same 81 province groups, legacy ids, and `data-*` attributes as before

#### Scenario: Data updates are scoped

- **WHEN** one city object in `data` changes and the others keep their identity
- **THEN** only the province whose data changed re-renders

#### Scenario: Style updates remain correct

- **WHEN** `customStyle` colors change
- **THEN** provinces reflect the new colors without losing selection, disabled, hover, or focus behavior

#### Scenario: Hover state does not leak

- **WHEN** the pointer moves from one province to another
- **THEN** only the new province is styled as hovered

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
