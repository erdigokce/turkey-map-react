# Styling and DOM ids

CSS custom properties, per-map overrides, per-province styling, container props, and instance ids.

[Back to README](../readme.md) · [Getting started](./getting-started.md) · [API reference](./api.md)

## Precedence

Province colors and outlines resolve in this order, highest precedence first:

1. `getCityStyle` for the individual province
2. `customStyle`
3. CSS custom property (`--tm-*`) with its built-in fallback
4. built-in default

When `values` is supplied, the choropleth fill takes the place of the idle fill and follows its own precedence: `getCityStyle` > `getColor` > function `colorScale` > array `colorScale` > `noDataColor`. `customStyle` still supplies the hover, selected, disabled, and stroke values used around that fill. See [Choropleth values and color scales](./choropleth.md).

## CSS custom properties

CSS custom properties can be set on an ancestor or directly on the map container through `style` or `containerProps.style`. They inherit, so two maps can use different themes without affecting each other.

| Variable              | Default   | Applies to                                      |
| :-------------------- | :-------- | :---------------------------------------------- |
| `--tm-idle-color`     | `#444`    | Idle province fill                              |
| `--tm-hover-color`    | `#dc3522` | Hovered province fill                           |
| `--tm-selected-color` | `#dc3522` | Selected province fill                          |
| `--tm-disabled-color` | `#e5e5e5` | Disabled province fill                          |
| `--tm-stroke-color`   | `none`    | Non-selected province outline (none by default) |
| `--tm-stroke-width`   | `0.5`     | Non-selected province outline width             |
| `--tm-focus-ring`     | `#1a73e8` | Keyboard focus outline color                    |
| `--tm-no-data-color`  | `#eeeeee` | Province fill when `values` has no value        |

```css
.checkout-map {
  --tm-idle-color: #eef2f7;
  --tm-hover-color: #1a73e8;
  --tm-selected-color: #0b3d91;
  --tm-disabled-color: #d8dee9;
  --tm-stroke-color: #ffffff;
  --tm-stroke-width: 0.75;
  --tm-focus-ring: #f59e0b;
}
```

```jsx
<TurkeyMap className="checkout-map" />
```

For a per-instance theme, set the variables inline. TypeScript consumers can cast the style object because custom properties are not part of `React.CSSProperties`:

```jsx
<TurkeyMap
  style={{ maxWidth: 800, '--tm-idle-color': '#eef2f7' } as React.CSSProperties}
/>
```

`customStyle` values override CSS variables. If you pass `customStyle`, the values you supply (including the required `idleColor` and `hoverColor`) win over inherited `--tm-*` values.

## `customStyle`

`customStyle` can set the per-map colors and a general province outline:

```jsx
<TurkeyMap
  customStyle={{
    idleColor: '#444',
    hoverColor: '#dc3522',
    selectedColor: '#1a73e8',
    selectedStroke: '#0b3d91',
    selectedStrokeWidth: 2,
    disabledColor: '#e5e5e5',
    strokeColor: '#ffffff',
    strokeWidth: 0.5,
    focusStroke: '#f59e0b',
    focusStrokeWidth: 3,
  }}
/>
```

`selectedStroke` and `selectedStrokeWidth` always win over `strokeColor` and `strokeWidth` for selected provinces. Omitting the general stroke fields adds no visible outline to the default rendering. `focusStroke` and `focusStrokeWidth` only affect the keyboard focus ring and never change fill, hover, selected, or disabled styling.

## Choropleth fills

When `values` is supplied, the computed value color replaces the idle fill:

- Hovering keeps the value or no-data fill and uses `hoverColor` as the outline.
- Selecting keeps the value or no-data fill and uses `selectedStroke` / `selectedStrokeWidth`.
- Disabled provinces keep `disabledColor` and the disabled cursor.
- Provinces without a value use `noDataColor`, which defaults to `--tm-no-data-color`.
- `getCityStyle` runs last and can override any of these properties.

```jsx
<TurkeyMap
  values={{ istanbul: 92, ankara: 45 }}
  colorScale={['#f7fbff', '#08306b']}
  noDataColor="#eeeeee"
  customStyle={{ hoverColor: '#f59e0b', selectedStroke: '#0b3d91' }}
/>
```

`animateValues` adds a 300 ms fill transition and is disabled automatically under `prefers-reduced-motion: reduce`.

## `getCityStyle`

`getCityStyle` runs for every province and receives the city plus its current interaction state:

```jsx
const getCityStyle = (city, state) => ({
  fill: state.disabled
    ? '#d8dee9'
    : state.selected
      ? '#0b3d91'
      : state.hovered
        ? '#1a73e8'
        : undefined,
  opacity: city.id === 'istanbul' ? 1 : 0.85,
  cursor: state.disabled ? 'not-allowed' : undefined,
});

<TurkeyMap getCityStyle={getCityStyle} />;
```

`CityInteractionState` contains `{ hovered, selected, disabled, focused }`. Returned values take precedence over `customStyle`, and any property set to `undefined` falls back to the resolved `customStyle`/CSS-variable value. Returning `undefined` or an empty object leaves the resolved style unchanged. The callback is not memoized by the component, so memoize expensive logic yourself if needed.

## Containers and ids

```jsx
<TurkeyMap
  id="checkout-map"
  className="checkout-map"
  style={{ maxWidth: 800, '--tm-idle-color': '#eef2f7' } as React.CSSProperties}
  containerProps={{ 'data-testid': 'checkout-map', dir: 'ltr' }}
  svgProps={{ 'aria-label': 'Select a province', role: 'img' }}
/>
```

`className` is joined with `containerProps.className`; `style` is merged over `containerProps.style`. Explicit `id`, `className`, and `style` props win over the same keys in `containerProps`, and `containerProps.children` is ignored because the map owns its subtree. `svgProps` can add ARIA attributes, data attributes, and event handlers; the component keeps `id`, `viewBox`, version, and namespace attributes authoritative.

When `id="checkout-map"` is supplied, component-level ids are derived as follows:

| Element        | With `id="checkout-map"` | With `id` omitted                        |
| :------------- | :----------------------- | :--------------------------------------- |
| Container      | `checkout-map`           | `svg-turkiye-haritasi-container`         |
| SVG            | `checkout-map-svg`       | `svg-turkiye-haritasi`                   |
| Tooltip        | `checkout-map-tooltip`   | `svg-turkiye-haritasi-container-tooltip` |
| Province group | `checkout-map-turkiye`   | `turkiye`                                |

Empty or whitespace-only ids are treated as omitted. The built-in tooltip animation name is also derived from `id`, so two maps with distinct ids do not share a keyframe name.

Province ids remain unchanged and unscoped: `<g id="istanbul">` stays `#istanbul` regardless of the map `id`. This keeps existing province selectors, event extraction, and custom datasets working. When rendering multiple maps, scope province CSS to each instance and pass distinct `id` values when isolation is required:

```jsx
<>
  <TurkeyMap id="map-a" showTooltip />
  <TurkeyMap id="map-b" showTooltip />
</>
```

```css
#map-a #istanbul path {
  fill: #0b3d91;
}

#map-b #istanbul path {
  fill: #eef2f7;
}
```

Province ids still repeat across instances by design; only component-level ids and animation names are instance-scoped.

The default tooltip can be styled through its DOM id. With `id="checkout-map"` use `#checkout-map-tooltip`; with `id` omitted use the legacy id:

```css
#svg-turkiye-haritasi-container > #svg-turkiye-haritasi-container-tooltip {
  background-color: rgba(54, 0, 99, 0.479);
}
```

With `tooltipPortal={true}` the tooltip is not a descendant of the map container, so target its id directly (for example `#svg-turkiye-haritasi-container-tooltip` or `#checkout-map-tooltip`) instead of using a descendant selector.

## Related

- [Accessibility](./accessibility.md) — focus-ring behavior and accessible naming.
- [API reference: styling and accessibility props](./api.md#styling-and-accessibility-props) — `customStyle`, `getCityStyle`, `ariaLabel`, and `a11yFallback`.
