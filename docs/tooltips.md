# Tooltips

Tooltip content, positioning, portals, delays, keyboard focus, and reduced motion.

[Back to README](../readme.md) · [Getting started](./getting-started.md) · [API reference](./api.md)

## Enabling tooltips

`showTooltip` remains the opt-in switch. When it is omitted, no tooltip markup or keyframes are rendered, and every new tooltip prop is inert. With `showTooltip={true}` and no other tooltip props, the built-in text tooltip, its DOM id, fade-out animation, and positioning are unchanged.

When you render your own markup, [`useTurkeyMap`](./headless.md#tooltips) exposes the same tooltip visibility, hover intent, anchoring, and reduced-motion state; you provide the content and decide whether to portal it.

### Custom content

```jsx
import TurkeyMap, { RenderTooltipCallback } from 'turkey-map-react';

const renderTooltip: RenderTooltipCallback = (city, value) => (
  <div>
    <strong>{city.name}</strong>
    <span>Plate {city.plateNumber}</span>
  </div>
);

<TurkeyMap showTooltip={true} renderTooltip={renderTooltip} />;
```

`renderTooltip` takes precedence over `tooltipText`, `disabledTooltipText`, and the province-name fallback, including for disabled provinces. The second `value` argument is the province's current choropleth value when `values` is supplied, otherwise `undefined`. A `null`, `false`, or empty return value renders an empty tooltip container without throwing.

The tooltip surface uses `pointer-events: none`, so custom content must not rely on hover, focus, or click interaction. Avoid placing interactive controls inside it.

### Cursor or province anchoring

```jsx
// Follow the pointer (default). The tooltip sits 16px right and 32px above it.
<TurkeyMap showTooltip={true} />

// Anchor above the hovered or focused province instead.
<TurkeyMap showTooltip={true} tooltipPosition="city" />
```

In city mode the tooltip is centered above the province's rendered bounds, separated by `tooltipOffset` pixels. City anchors are computed when the tooltip is revealed or the active province changes and are refreshed when a zoomable map zooms or pans; they are not updated on scroll or resize, and no viewport collision detection or flipping is included.

### Portals for clipping containers

```jsx
<div style={{ overflow: 'hidden', height: 400 }}>
  <TurkeyMap showTooltip={true} tooltipPortal={true} />
</div>
```

`tooltipPortal` renders the tooltip as a direct child of `document.body`, keeping the same id, content, visibility, and accessibility attributes. It escapes ancestor `overflow: hidden`, works in server rendering without touching `document`, and is removed on unmount or when the prop becomes `false`. The legacy `#svg-turkiye-haritasi-container-tooltip` id is preserved in both modes; with a custom map `id`, the tooltip id is derived from it. Portal mode uses `position: fixed` with client coordinates, keeps `zIndex: 1`, and can still leave the viewport near edges.

### Offset and hover-intent delay

```jsx
<TurkeyMap
  showTooltip={true}
  tooltipOffset={8}   // 8px right, 16px above in cursor mode
  tooltipDelay={120}  // wait before the first reveal and before hiding
/>
```

`tooltipOffset` defaults to `16`; `NaN`, `Infinity`, or a non-numeric runtime value falls back to the default, and negative values are treated as `0`.

`tooltipDelay` defaults to `80` ms and acts as both the reveal delay and the leave grace period. The grace period prevents flicker when crossing adjacent provinces and brief empty gaps. `tooltipDelay={0}` restores immediate showing and hiding. A non-finite delay falls back to `80`, and a negative delay is treated as `0`.

### Reduced motion and keyboard focus

The tooltip respects `prefers-reduced-motion: reduce`: when reduced motion is requested, hiding is immediate and the fade animation is not applied. The keyframe definition remains in the document for backward compatibility. When `window.matchMedia` is unavailable (including server rendering), the tooltip uses the non-animated behavior. The media-query listener is cleaned up on unmount.

When `showTooltip` is enabled, keyboard focus reveals the tooltip immediately for the focused province, anchored to that province regardless of `tooltipPosition`. Blurring returns the tooltip to a hovered province when one is active, otherwise it hides. Focus-triggered tooltips work in every mode, including `"none"` mode where the map now has a single roving tab stop, and the tooltip shell itself is not focusable.

## Related

- [Zoom and pan](./zoom-pan.md) — city-anchored tooltips follow viewport changes.
- [Accessibility](./accessibility.md) — keyboard focus behavior and screen-reader announcements.
- [API reference: tooltip props](./api.md#tooltip-props) — all tooltip options.
