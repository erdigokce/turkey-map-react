## ADDED Requirements

### Requirement: City-anchored tooltips follow viewport changes

When `showTooltip` is enabled, `tooltipPosition` is `"city"`, and a tooltip is visible, a viewport zoom or pan SHALL reposition the tooltip so it remains above and centered on the active province's current rendered bounds. The tooltip content, visibility, reduced-motion behavior, and hover-intent delay MUST remain unchanged. The reposition MUST NOT restart the reveal delay or emit `onHover`. Cursor-positioned tooltips MUST continue to follow the pointer as before.

#### Scenario: Zoom keeps the tooltip attached

- **WHEN** a city-anchored tooltip is visible and the user zooms the map
- **THEN** the tooltip stays above and centered on the same province after the transform

#### Scenario: Pan keeps the tooltip attached

- **WHEN** a city-anchored tooltip is visible and the user pans the map
- **THEN** the tooltip moves with the province rather than staying at its previous position

#### Scenario: Content and delay are preserved

- **WHEN** the viewport changes while a city-anchored tooltip is visible
- **THEN** the tooltip content does not change, no new reveal delay starts, and `onHover` does not fire again

#### Scenario: Cursor tooltips are unaffected

- **WHEN** `tooltipPosition="cursor"` and the viewport changes while the pointer is stationary
- **THEN** the tooltip keeps its existing pointer-based position behavior

#### Scenario: Hidden tooltips stay hidden

- **WHEN** the tooltip is not visible and the viewport changes
- **THEN** no tooltip is revealed as a side effect
