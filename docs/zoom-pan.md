# Zoom and pan

Opt-in zoom, pan, keyboard shortcuts, accessible controls, and an imperative ref API.

[Back to README](../readme.md) · [Getting started](./getting-started.md) · [API reference](./api.md)

## Enabling zoom and pan

Everything in this guide is opt-in through `zoomable`. Without it the map renders exactly as before: no transform, gestures, keyboard shortcuts, controls, or extra tab stop.

```jsx
<TurkeyMap zoomable minZoom={1} maxZoom={8} zoomControls />

ref.current?.focusCity('istanbul');
ref.current?.zoomTo(2);
ref.current?.resetView();
```

## Props

| Property           | Description                                                                 | Type                     | Default |
| :----------------- | :-------------------------------------------------------------------------- | :----------------------- | :------ |
| `zoomable`         | Enables wheel, pinch, double-click, drag, keyboard zoom/pan, and the ref API. | `boolean`                | `false` |
| `minZoom`          | Minimum scale. Values must be finite and `>= 1`.                             | `number`                 | `1`     |
| `maxZoom`          | Maximum scale. Values below `minZoom` are raised to `minZoom`.               | `number`                 | `8`     |
| `zoomControls`     | Renders accessible zoom-in, zoom-out, and reset buttons.                     | `boolean`                | `false` |
| `viewport`         | Controlled viewport value.                                                   | `Viewport`               | -       |
| `onViewportChange` | Fires when a gesture or ref call changes the viewport.                       | `(v: Viewport) => void`  | -       |

Zoom-related props are ignored with a development warning when `zoomable` is omitted.

## Viewport shape and units

```ts
type Viewport = {
  scale: number;
  translateX: number;
  translateY: number;
};
```

`scale` is the zoom factor within `[minZoom, maxZoom]`. `translateX` and `translateY` are offsets in SVG viewBox user units, applied after scaling. The rendered transform is `translate(tx ty) scale(scale)`.

The viewport is always normalized before rendering: invalid numbers fall back to safe values, scales are clamped, and translations are limited so the map cannot be dragged out of its viewport. At `minZoom` the map is centered and panning has no effect.

## Controlled and uncontrolled viewports

Uncontrolled mode starts at `minZoom`, centered. Gestures and ref calls update the map and report the new value:

```jsx
function Map() {
  return (
    <TurkeyMap
      zoomable
      onViewportChange={(viewport) => console.log(viewport)}
    />
  );
}
```

Controlled mode follows the value you supply. Gestures still emit `onViewportChange`, but the rendered viewport does not change until the parent supplies a new value:

```jsx
const [viewport, setViewport] = useState({ scale: 1, translateX: 0, translateY: 0 });

<TurkeyMap
  zoomable
  viewport={viewport}
  onViewportChange={setViewport}
/>;
```

`onViewportChange` does not fire on mount or merely because a parent re-rendered.

## Imperative ref API

The root and core entries expose a typed `TurkeyMapRef`:

```tsx
import { useRef } from 'react';
import TurkeyMap, { TurkeyMapRef } from 'turkey-map-react';

const ref = useRef<TurkeyMapRef>(null);

<TurkeyMap ref={ref} zoomable />;

ref.current?.focusCity('istanbul');     // center and zoom to 2x
ref.current?.focusCity('ankara', 5);    // center at an explicit scale
ref.current?.zoomTo(2);                 // absolute scale around the current center
ref.current?.resetView();               // back to minZoom, centered
```

- `focusCity(cityId, zoom?)` uses the province's rendered bounds. The default focus scale is `max(currentScale, 2)`, clamped to the zoom bounds. Unknown ids emit a development warning and do nothing. Disabled provinces can still be focused; focusing does not select them.
- `zoomTo(scale)` treats `scale` as absolute and clamps it.
- `resetView()` returns to `minZoom` with the map centered.

In controlled mode these methods report the requested normalized viewport through `onViewportChange` but do not replace the controlled value. Ref methods are safe to call on an unmounted map or during server rendering.

## Gestures

| Input             | Behavior                                                        |
| :---------------- | :-------------------------------------------------------------- |
| Wheel             | Zoom in or out around the pointer.                              |
| Pinch             | Zoom around the midpoint between two touch pointers.            |
| Double-click      | Zoom in around the pointer, clamped to `maxZoom`.               |
| Primary drag      | Pan the map, clamped to the map bounds.                         |
| Secondary button  | Ignored; does not pan or suppress clicks.                       |

A movement threshold distinguishes taps from drags: `4` CSS pixels for mouse and pen, `8` for touch. A drag beyond the threshold suppresses the click and selection activation for that gesture only. Hover, tooltips, keyboard activation, and the next tap are unaffected.

`zoomable` sets `touch-action: none` on the SVG and wheel zoom calls `preventDefault()`. This means touch scrolling and page scroll over the map are intentionally reserved for the map while zoom is enabled. Scroll outside the map, or omit `zoomable`, when page scrolling should take precedence.

## Keyboard shortcuts

When `zoomable`, the SVG viewport is one additional tab stop before the provinces. While the SVG itself has focus:

| Key                         | Action                                      |
| :-------------------------- | :------------------------------------------ |
| `+` / `=`                   | Zoom in around the current center.          |
| `-` / `_`                   | Zoom out around the current center.         |
| Arrow keys                  | Pan by 10% of the viewBox in that direction. |
| `0`                         | Reset to `minZoom`, centered.               |

Province keyboard navigation is unchanged. Arrow keys, Home/End, Enter/Space, and Escape continue to operate on the focused province; the viewport shortcuts only run when the SVG viewport itself has focus.

## Zoom controls

`zoomControls` renders a labeled group after the SVG:

- **Zoom in** and **Zoom out** are disabled at `maxZoom` and `minZoom`.
- **Reset view** is disabled when the viewport is already at the reset position.
- Buttons are keyboard operable and use stable class names `tm-zoom-controls` and `tm-zoom-control`.

Consumers who need different labels or placement can render their own controls and call the ref API; custom control rendering is not part of this change.

## Server rendering and compatibility

Zoom and pan add no runtime dependencies, do not touch `window` or `document` during module evaluation or server rendering, and keep React >=16.8 compatibility. Server-rendered zoomable maps include the initial transform and any requested controls.

This feature is additive and non-breaking. The v3.0 target does not require a container markup migration: the legacy container, SVG, tooltip, province group, and city ids are unchanged, and omitting `zoomable` preserves existing behavior exactly.

## Related

- [Accessibility](./accessibility.md) — viewport tab stop, controls, and preserved province navigation.
- [Tooltips](./tooltips.md) — city-anchored tooltips follow zoom and pan.
- [API reference: zoom and pan props](./api.md#zoom-and-pan-props) — full prop and type signatures.
