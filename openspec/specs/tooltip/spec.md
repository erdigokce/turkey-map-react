# tooltip Specification

## Purpose

Lets consumers replace the built-in text tooltip with custom content, anchor it to the pointer or the hovered province, render it through a portal to escape clipping containers, and drive it with pointer, touch, pen, mouse, and keyboard focus without changing existing tooltip behavior.

## Requirements

### Requirement: Tooltip remains opt-in and backward compatible

The tooltip MUST remain disabled unless `showTooltip` is `true`. With no new props supplied, the existing text behavior, default positioning, fade-out animation, DOM id `#svg-turkiye-haritasi-container-tooltip`, and container placement MUST be unchanged. `tooltipText` MUST continue to override the province name for the built-in tooltip, and a disabled province MUST continue to resolve its text through the existing disabled-tooltip behavior.

#### Scenario: Default map has no tooltip

- **WHEN** `<TurkeyMap />` is rendered without `showTooltip`
- **THEN** no tooltip element, keyframes, or tooltip-related portal is rendered

#### Scenario: Existing text tooltip is unchanged

- **WHEN** `showTooltip` is `true` and no new tooltip props are supplied
- **THEN** the tooltip renders in the map container with the existing id, shows the hovered province name or `tooltipText`, and uses the existing fade-out behavior

#### Scenario: New props without showTooltip are inert

- **WHEN** `renderTooltip`, `tooltipPosition`, `tooltipPortal`, `tooltipOffset`, or `tooltipDelay` is supplied while `showTooltip` is `false` or omitted
- **THEN** no tooltip is rendered and no tooltip behavior is added to the map

### Requirement: Custom tooltip content via `renderTooltip`

The component SHALL accept `renderTooltip?: (city: CityType, value?: unknown) => React.ReactNode`. When supplied and `showTooltip` is `true`, its return value MUST be rendered as the tooltip content for the hovered or focused province. The callback MUST receive the same `CityType` object supplied through `data`. The second argument MUST always be `undefined` in this change and is reserved for a future per-city value API. `renderTooltip` MUST take precedence over `tooltipText`, `disabledTooltipText`, and the province-name fallback. When `renderTooltip` is absent, the built-in text content MUST be used. A `null`, `false`, or empty return value MUST render an empty tooltip container without throwing.

#### Scenario: Custom element content

- **WHEN** `showTooltip` and `renderTooltip={(city) => <strong>{city.name} card</strong>}` are supplied and a province is hovered
- **THEN** the tooltip contains the rendered custom element for that province

#### Scenario: Custom content overrides text props

- **WHEN** `renderTooltip`, `tooltipText="Fallback"`, and `showTooltip` are supplied
- **THEN** the tooltip shows the custom content and does not fall back to `tooltipText`

#### Scenario: Custom content for a disabled province

- **WHEN** `renderTooltip` is supplied and a disabled province is hovered
- **THEN** the custom content is rendered for that province instead of `disabledTooltipText`

#### Scenario: Built-in fallback still works

- **WHEN** `renderTooltip` is omitted and `showTooltip` is `true`
- **THEN** the tooltip shows `tooltipText` when supplied and the province name otherwise

#### Scenario: Empty custom output is tolerated

- **WHEN** `renderTooltip` returns `null`
- **THEN** the tooltip element remains mounted and empty, and no error is thrown

#### Scenario: Full city object is supplied

- **WHEN** custom `data` is supplied and `renderTooltip` is called for a province
- **THEN** the callback receives the exact city object from `data`, including its `id`, `name`, `plateNumber`, `path`, and any optional fields

### Requirement: Configurable tooltip anchoring

The component SHALL accept `tooltipPosition?: "cursor" | "city"` with a default of `"cursor"`. In `"cursor"` mode the tooltip MUST follow the pointer while it is visible. With the default `tooltipOffset` of `16`, pointer placement MUST preserve the existing displacement of 16 pixels to the right and 32 pixels above the pointer. A custom `tooltipOffset` MUST shift the tooltip proportionally: `offset` pixels to the right and twice `offset` pixels above. In `"city"` mode the tooltip MUST be anchored above the hovered or focused province, horizontally centered on that province, separated from it by `tooltipOffset` pixels. An omitted or non-finite `tooltipOffset` MUST fall back to `16`; a negative `tooltipOffset` MUST be treated as `0`. Positioning MUST be derived from the active province and pointer state, not from direct DOM mutation of the tooltip's siblings.

#### Scenario: Cursor mode is the default

- **WHEN** `showTooltip` is `true` and `tooltipPosition` is omitted
- **THEN** moving the pointer across a province moves the tooltip with the pointer

#### Scenario: Default cursor displacement

- **WHEN** the pointer is at page position `(100, 200)` with the default `tooltipOffset`
- **THEN** the tooltip is positioned at 16 pixels to the right and 32 pixels above the pointer

#### Scenario: Custom offset

- **WHEN** `tooltipOffset={8}` and `tooltipPosition="cursor"`
- **THEN** the tooltip is positioned 8 pixels to the right and 16 pixels above the pointer

#### Scenario: City anchoring

- **WHEN** `tooltipPosition="city"` and a province is hovered
- **THEN** the tooltip appears above and horizontally centered on that province's rendered bounds rather than at the pointer

#### Scenario: City anchor follows a new province

- **WHEN** `tooltipPosition="city"` and the pointer moves directly from one province to another
- **THEN** the tooltip content and position update to the newly hovered province

#### Scenario: Invalid offset is tolerated

- **WHEN** `tooltipOffset` is `NaN`, `Infinity`, or non-numeric at runtime
- **THEN** rendering does not throw and the default offset is used

### Requirement: Optional portal rendering

The component SHALL accept `tooltipPortal?: boolean` with a default of `false`. When `true` and `showTooltip` is `true`, the tooltip MUST be rendered as a direct child of `document.body`, keeping the same `id`, content, visibility, and accessibility attributes as inline mode. Portal mode MUST place the tooltip outside any map-container ancestor so ancestor `overflow: hidden` cannot clip it. When `false`, the tooltip MUST remain inside the map container exactly as before. The portal element MUST be removed when the map unmounts or when `tooltipPortal` becomes `false`. Server rendering MUST NOT access `document`; a server-rendered map MUST not throw, and portal activation happens only after the component mounts on the client.

#### Scenario: Portal escapes clipping

- **WHEN** the map is rendered inside a container with `overflow: hidden` and `tooltipPortal` is `true`
- **THEN** the tooltip element is a child of `document.body` and is not a descendant of the clipping container

#### Scenario: Portal keeps the legacy id

- **WHEN** `tooltipPortal` is `true` and the tooltip is visible
- **THEN** `document.getElementById("svg-turkiye-haritasi-container-tooltip")` resolves to the portaled tooltip

#### Scenario: Inline mode is unchanged

- **WHEN** `tooltipPortal` is omitted or `false`
- **THEN** the tooltip renders inside the map container as before

#### Scenario: Portal toggles off

- **WHEN** `tooltipPortal` changes from `true` to `false` after mount
- **THEN** no tooltip remains in `document.body` and the tooltip renders inline again

#### Scenario: Unmount removes the portal

- **WHEN** a map with `tooltipPortal` enabled unmounts
- **THEN** its tooltip element is removed from `document.body`

#### Scenario: Hidden map hides a portaled tooltip

- **WHEN** `visible` is `false` while `tooltipPortal` is `true`
- **THEN** the tooltip is hidden or not portaled, matching the existing behavior of hiding the whole map

#### Scenario: Server rendering is safe

- **WHEN** the component is rendered to a string on a server with `tooltipPortal` enabled
- **THEN** rendering does not throw and does not access `document`

### Requirement: Pointer, touch, pen, and mouse-fallback interaction

When `showTooltip` is `true`, tooltip visibility and anchor tracking MUST be driven by Pointer Events: `pointerenter` starts hovering a province, `pointermove` updates the cursor anchor, and `pointerleave` or `pointercancel` ends it. The tooltip MUST work for touch and pen input through the same Pointer Events and MUST NOT require a mouse. In environments where `PointerEvent` is unavailable, equivalent mouse events (`mouseenter`, `mouseleave`, `mousemove`) MUST provide the same behavior, and when Pointer Events are available the mouse fallback MUST NOT double-process an interaction. Pointer interaction with the tooltip MUST NOT change `onHover`, `onClick`, `onSelect`, `onSelectionChange`, or selection state, and the tooltip MUST NOT trigger interaction callbacks. Disabled provinces MUST still reveal the tooltip subject to the existing disabled-tooltip behavior. The tooltip element MUST NOT intercept pointer events from the map, including in portal mode.

#### Scenario: Touch contact shows the tooltip

- **WHEN** a touch pointer enters and remains on a province with `showTooltip` enabled
- **THEN** the tooltip becomes visible for that province

#### Scenario: Pen movement updates the tooltip

- **WHEN** a pen pointer moves across a province with `tooltipPosition="cursor"`
- **THEN** the tooltip remains visible and follows the pen

#### Scenario: Pointer cancel hides the tooltip

- **WHEN** a pointer interaction is cancelled while the tooltip is visible
- **THEN** the tooltip hides using the configured reduced-motion or fade behavior

#### Scenario: Mouse fallback without PointerEvent

- **WHEN** `PointerEvent` is not available and the user enters, moves over, and leaves a province with a mouse
- **THEN** the tooltip shows, follows the cursor, and hides exactly as in pointer mode

#### Scenario: No duplicate handling

- **WHEN** Pointer Events are supported and a mouse triggers both pointer and compatibility mouse events
- **THEN** the tooltip lifecycle runs once per interaction

#### Scenario: Tooltip does not affect map interactions

- **WHEN** the tooltip is visible or portaled and the user clicks or selects a province
- **THEN** the existing click and selection callbacks fire exactly once

#### Scenario: Tooltip does not capture the pointer

- **WHEN** the pointer moves over the visible tooltip
- **THEN** the tooltip does not receive the interaction and does not block the map underneath

#### Scenario: Disabled province tooltip is preserved

- **WHEN** `showTooltip` is enabled and a disabled province is hovered
- **THEN** the tooltip is shown with the existing disabled-tooltip text resolution, without emitting `onHover`

### Requirement: Hover-intent delay

The component SHALL accept `tooltipDelay?: number` in milliseconds with a default of `80`. The delay MUST apply before the tooltip first becomes visible after being hidden. Moving the pointer to another province while the tooltip is visible MUST update content immediately and MUST NOT restart the delay. Leaving before the delay elapses MUST cancel the pending reveal and MUST NOT show the tooltip. Re-entering a province while the hide animation is running MUST cancel the hide and keep the tooltip visible. `tooltipDelay={0}` MUST show the tooltip without waiting. An omitted or non-finite `tooltipDelay` MUST fall back to `80`; a negative value MUST be treated as `0`. Pending timers MUST be cleared when the component unmounts.

#### Scenario: Show waits for the delay

- **WHEN** `tooltipDelay={100}` and the pointer enters a province
- **THEN** the tooltip is still hidden immediately after entry and becomes visible after 100 milliseconds

#### Scenario: Early leave cancels the reveal

- **WHEN** `tooltipDelay={100}` and the pointer leaves before 100 milliseconds
- **THEN** the tooltip never becomes visible

#### Scenario: Moving between adjacent provinces avoids flicker

- **WHEN** the tooltip is visible and the pointer moves directly from one province to an adjacent province
- **THEN** the tooltip stays visible and updates its content without waiting for the delay again

#### Scenario: Zero delay is immediate

- **WHEN** `tooltipDelay={0}` and the pointer enters a province
- **THEN** the tooltip becomes visible without an observable delay

#### Scenario: Empty gap between provinces keeps hover intent

- **WHEN** the pointer briefly crosses a gap with no province and returns within the delay window
- **THEN** the tooltip does not re-hide and does not restart a full reveal cycle

#### Scenario: Unmount clears a pending reveal

- **WHEN** the map unmounts while a tooltip reveal is scheduled
- **THEN** no state update or timer callback runs after unmount

### Requirement: Reduced-motion support

The tooltip MUST respect `prefers-reduced-motion: reduce`. When the user requests reduced motion, hiding the tooltip MUST take effect immediately and no fade-out animation MUST be applied to the tooltip. When motion is allowed, the existing fade-out animation MUST be preserved. The keyframe definition may remain in the document for backward compatibility; only its application to the tooltip is suppressed. The component MUST react to a change in the media query after mount and MUST remove its listener on unmount. In environments without `matchMedia` (including server rendering and tests), the component MUST not throw and MUST use the non-animated behavior.

#### Scenario: Reduced motion hides immediately

- **WHEN** the user prefers reduced motion and the pointer leaves a province
- **THEN** the tooltip becomes hidden immediately with no animation applied

#### Scenario: Motion allowed keeps the fade

- **WHEN** the user does not prefer reduced motion and the pointer leaves a province
- **THEN** the existing fade-out animation is applied

#### Scenario: Preference changes at runtime

- **WHEN** the motion preference changes while the map is mounted
- **THEN** the next tooltip hide uses the new preference without remounting the map

#### Scenario: No matchMedia support

- **WHEN** `window.matchMedia` is unavailable
- **THEN** tooltip behavior works without throwing and uses the non-animated hide

### Requirement: Tooltip accessibility and focus support

The tooltip element MUST expose `role="tooltip"` and MUST reflect its visibility to assistive technology, using `aria-hidden="true"` while hidden and no hidden state while visible. When `showTooltip` is `true` and a province receives keyboard focus, the tooltip MUST be shown for that province anchored to the province regardless of `tooltipPosition`, and it MUST hide when focus leaves. Focus-triggered tooltips MUST appear without the hover-intent delay. The tooltip shell MUST NOT add focusable elements or keyboard tab stops of its own; consumers are responsible for not placing interactive controls inside a non-interactive tooltip surface. This requirement MUST NOT add new keyboard tab stops when `selectionMode` is `"none"`.

#### Scenario: Tooltip role and hidden state

- **WHEN** the tooltip is rendered but not visible
- **THEN** it has `role="tooltip"` and `aria-hidden="true"`

#### Scenario: Visible tooltip is exposed

- **WHEN** the tooltip becomes visible
- **THEN** it no longer reports `aria-hidden="true"`

#### Scenario: Keyboard focus reveals the tooltip

- **WHEN** `showTooltip` is `true`, a selection mode is active, and a province receives keyboard focus
- **THEN** the tooltip shows that province's content anchored above the province

#### Scenario: Blur hides the tooltip

- **WHEN** a focused province loses focus while its tooltip is visible
- **THEN** the tooltip hides

#### Scenario: No new tab stops without selection

- **WHEN** `selectionMode` is `"none"` and `showTooltip` is `true`
- **THEN** this feature does not add keyboard focus stops to provinces

#### Scenario: Tooltip shell adds no focus target

- **WHEN** the tooltip is rendered
- **THEN** the tooltip element itself is not focusable and does not add a keyboard tab stop

### Requirement: Public types and compatibility

The change MUST remain backward compatible. New props MUST be optional, `showTooltip`, `tooltipText`, existing DOM ids, snapshots, callbacks, and positioning MUST keep working, and the change MUST NOT add runtime dependencies or materially grow the published entry bundle beyond the existing tooltip logic. The public types `TooltipPosition` and `RenderTooltipCallback` MUST be exported, and the second `renderTooltip` argument MUST remain optional so single-argument callbacks continue to type-check.

#### Scenario: Existing consumers are unaffected

- **WHEN** a consumer supplies only the existing tooltip props
- **THEN** the component type-checks and renders exactly as before

#### Scenario: Single-argument renderer type-checks

- **WHEN** `renderTooltip={(city) => city.name}` is supplied
- **THEN** the callback is accepted with `city` typed as `CityType`

#### Scenario: Two-argument renderer type-checks

- **WHEN** `renderTooltip={(city, value) => String(value ?? city.name)}` is supplied
- **THEN** the callback is accepted and `value` is typed as optional

#### Scenario: No runtime dependencies added

- **WHEN** the package is built and its dependencies are inspected
- **THEN** the package still has zero runtime dependencies and the tooltip change adds no new bundled dependency
