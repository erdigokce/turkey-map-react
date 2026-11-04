# Accessibility

Keyboard navigation, ARIA semantics, live-region announcements, focus styling, and the native select fallback.

[Back to README](../readme.md) · [Getting started](./getting-started.md) · [API reference](./api.md)

## Keyboard and screen-reader support

The map is keyboard operable and exposes selection semantics without any extra configuration. If you own the markup, [`useTurkeyMap`](./headless.md#live-region-and-focus) exposes the same roles, roving tab stop, accessible names, focus movement, and live-region text through its prop getters.

The province container (`<g id="turkiye">`) is a labeled `listbox` in `"single"` and `"multiple"` modes, and a labeled `group` in `"none"` mode. `ariaLabel` overrides its accessible name; the default is `"Turkey map"`. In multiple mode the container also exposes `aria-multiselectable="true"`. Every province is named `"<name>, plate <plateNumber>"` (for example `"İstanbul, plate 34"`) and exposes `role="option"` with `aria-selected` in selection modes, or `role="button"` without `aria-selected` in `"none"` mode. Disabled provinces keep `aria-disabled="true"` and their accessible name.

## Keyboard navigation

The provinces use one roving tab stop. Tab enters the selected province when there is a selection, otherwise the first enabled province; every other province has `tabindex="-1"`. This also applies to `selectionMode="none"`, which is the one intentional keyboard behavior change in the accessibility release. Disabled provinces stay in the roving order so screen readers can announce them, but activation is inert. When `zoomable` is enabled, the SVG viewport adds exactly one tab stop before the provinces, with its own accessible name and shortcuts.

| Key                        | Action                                                                    |
| :------------------------- | :------------------------------------------------------------------------ |
| `ArrowRight` / `ArrowDown` | Move focus to the next province in data order.                            |
| `ArrowLeft` / `ArrowUp`    | Move focus to the previous province in data order.                        |
| `Home` / `End`             | Move focus to the first or last province.                                 |
| `Enter` / `Space`          | Select or toggle the focused province, or call `onClick` in `"none"` mode. |
| `Escape`                   | Clear the selection without firing `onSelect`.                            |

Navigation stops at the first and last province rather than wrapping. In controlled selection, Escape reports the clear through `onSelectionChange([])` and the parent remains responsible for updating the value.

## Zoomable maps

With `zoomable`, the SVG viewport is focusable and labeled with instructions containing the map name and its zoom/pan keys. Provider-supplied `svgProps` accessible names or `aria-labelledby` take precedence over the default description.

| Key                         | Action                                      |
| :-------------------------- | :------------------------------------------ |
| `+` / `=`                   | Zoom in around the current center.          |
| `-` / `_`                   | Zoom out around the current center.         |
| Arrow keys                  | Pan by 10% of the viewBox in that direction. |
| `0`                         | Reset to the minimum zoom, centered.        |

These shortcuts run only when the SVG viewport itself has focus. Province keyboard navigation remains authoritative: arrows, Home/End, Enter/Space, Escape, live announcements, and disabled-province behavior are unchanged. Zoom-control buttons are native buttons with names, disabled states at the bounds, visible focus, and no effect on province selection.

## Live region

A visually hidden polite live region announces the focused province, including selected and disabled state, plus selection changes and clearing. Hover does not write to the live region.

## Focus ring

The focus ring is shown for keyboard focus in every mode, including `"none"`. Clicking or tapping a province with a pointer does not show the ring. It defaults to a 2px `#1a73e8` outline and can be customized through `customStyle.focusStroke` and `customStyle.focusStrokeWidth`. The outline color also reads the `--tm-focus-ring` CSS custom property when defined.

## Native select fallback

Set `a11yFallback` in a selection mode to render a visually hidden native `<select>` for assistive technology and form tooling. It mirrors the effective selection, disables options for disabled provinces, and routes changes through the same selection callbacks and `maxSelection` rules as the map. It is off by default and ignored with a development warning in `"none"` mode.

```jsx
<TurkeyMap
  selectionMode="multiple"
  selectedCities={selectedCityIds}
  onSelectionChange={(cities) => setSelectedCityIds(cities.map((city) => city.id))}
  a11yFallback
/>
```

## Customizing the focus ring

```jsx
<TurkeyMap
  selectionMode="single"
  ariaLabel="Türkiye haritası"
  customStyle={{
    idleColor: '#444',
    hoverColor: '#dc3522',
    focusStroke: '#f59e0b',
    focusStrokeWidth: 3,
  }}
/>
```

`--tm-focus-ring` is honored now as the focus-ring color; the full `--tm-*` theming API remains future work. When using `cityWrapper`, do not add interactive children inside an individual province, because the province owns the keyboard activation and the wrapper would interrupt the roving focus model.

## Related

- [Zoom and pan](./zoom-pan.md) — gestures, viewport state, controls, and the ref API.
- [Styling and DOM ids](./styling.md) — focus ring colors and CSS custom properties.
- [Custom data and cities](./custom-data.md#disabled-provinces) — disabled province behavior.
- [API reference: styling and accessibility props](./api.md#styling-and-accessibility-props) — `ariaLabel` and `a11yFallback`.
