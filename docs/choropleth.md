# Choropleth values and color scales

Color provinces by a numeric metric with linear, quantized, quantile, and threshold scales.

[Back to README](../readme.md) · [Styling and DOM ids](./styling.md) · [API reference](./api.md)

## Data contract

Pass `values` as an object keyed by city `id`. Only finite numbers count as data.

```jsx
import TurkeyMap from 'turkey-map-react';

const values = {
  istanbul: 92,
  ankara: 45,
  izmir: 61,
};

<TurkeyMap values={values} colorScale={['#f7fbff', '#08306b']} />;
```

- A province with no matching key, a non-number value, `NaN`, or `Infinity` renders with `noDataColor`.
- Keys that do not match a rendered city are ignored.
- Supplying `values` turns choropleth mode on, even when the object is empty. Omitting `values` leaves the existing idle, hover, selected, disabled, and theming behavior untouched.
- Values are not mutated and no data is fetched or aggregated for you.

The domain is derived from the supplied values. There is no separate `domain` prop.

## No-data color

Provinces without a value use `noDataColor`, which defaults to the documented CSS custom property:

```jsx
<TurkeyMap values={values} noDataColor="#d9d9d9" />
```

```css
.my-map {
  --tm-no-data-color: #d8dee9;
}
```

`noDataColor` wins over `--tm-no-data-color`. The variable is useful when several maps share a theme.

## Color scales

`colorScale` accepts either an array of colors or a function.

```jsx
<TurkeyMap values={values} colorScale={['#f7fbff', '#6baed6', '#08306b']} />
```

The array is interpreted by `scaleType`. The default scale type is `"linear"` and the default palette is `["#f7fbff", "#08306b"]`.

| `scaleType` | Behavior                                                                                           | Best for                              |
| :---------- | :------------------------------------------------------------------------------------------------- | :------------------------------------ |
| `linear`    | Interpolates continuously between adjacent color stops across `[min, max]`.                        | Continuous metrics such as rates.     |
| `quantize`  | Splits `[min, max]` into `colorScale.length` equal-width buckets.                                  | Values where equal numeric ranges matter. |
| `quantile`  | Computes `colorScale.length - 1` boundaries from the sorted values, producing roughly equal counts. | Skewed distributions and rankings.    |
| `threshold` | Uses explicit `thresholds`; requires `thresholds.length + 1` colors.                               | Fixed business or policy boundaries.  |

The minimum value receives the first color and the maximum receives the last color for `linear`, `quantize`, and `quantile`. When every value is identical, those three scale types use the last color.

### Linear

```jsx
<TurkeyMap
  values={values}
  colorScale={['#f7fbff', '#08306b']}
  scaleType="linear"
/>
```

Linear interpolation blends adjacent `#rgb` or `#rrggbb` stops in sRGB. Other CSS color strings are used as the nearer stop rather than blended.

### Quantize

```jsx
<TurkeyMap
  values={values}
  colorScale={['#eff3ff', '#bdd7e7', '#6baed6', '#2171b5', '#08306b']}
  scaleType="quantize"
/>
```

The color count controls the number of equal-width buckets. No thresholds are needed.

### Quantile

```jsx
<TurkeyMap
  values={values}
  colorScale={['#eff3ff', '#6baed6', '#08306b']}
  scaleType="quantile"
/>
```

Quantile buckets are derived from the values, so each color covers roughly the same number of provinces. Duplicate values are assigned deterministically.

### Threshold

```jsx
<TurkeyMap
  values={values}
  colorScale={['#eff3ff', '#bdd7e7', '#6baed6', '#08306b']}
  scaleType="threshold"
  thresholds={[10, 25, 50]}
/>
```

With three thresholds you need four colors:

| Value range | Color      |
| :---------- | :--------- |
| below 10    | `#eff3ff`  |
| 10–24       | `#bdd7e7`  |
| 25–49       | `#6baed6`  |
| 50 and above| `#08306b`  |

Thresholds are sorted for you. If `thresholds` is missing or its length does not equal `colorScale.length - 1`, the scale falls back to `quantize` with a development warning so rendering never throws. `thresholds` is ignored by the other scale types.

## Function scales

A function scale receives each raw value and returns a color directly, bypassing `scaleType`:

```jsx
<TurkeyMap
  values={values}
  colorScale={(value) => (value > 50 ? '#08306b' : '#f7fbff')}
/>
```

Return a non-empty string. An empty string, `undefined`, or another type falls back to `noDataColor`.

## `getColor` escape hatch

Use `getColor` when the color depends on the province as well as its value. It takes precedence over both forms of `colorScale`:

```jsx
<TurkeyMap
  values={values}
  getColor={(value, city) => (city.id === 'istanbul' ? '#08306b' : value > 50 ? '#2171b5' : '#f7fbff')}
/>
```

`getColor` is called only for provinces with a finite value. If it returns an empty string or an invalid value, the component falls back to `colorScale` and then `noDataColor`.

## Value transitions

Set `animateValues` to transition province fills when values change:

```jsx
<TurkeyMap values={values} animateValues />
```

The transition is `fill 300ms ease`. It is not applied when the user prefers reduced motion, and it can be combined with `prefers-reduced-motion` in browsers that support it. Only the fill transitions; hover, selection, focus, and disabled outlines remain instant.

## Interaction and layering

Choropleth fills are designed to keep the metric visible while interacting:

- Hovering keeps the value or no-data fill and draws an outline with `hoverColor`.
- Selecting keeps the value or no-data fill and uses `selectedStroke` / `selectedStrokeWidth`.
- A selected province keeps its selected outline when hovered.
- Disabled provinces keep the disabled fill and cursor instead of the value color.
- `getCityStyle` remains the highest-precedence layer and can override the fill, outline, or transition for any province.

The fill precedence is:

1. `getCityStyle`
2. `getColor`
3. function `colorScale`
4. array `colorScale` interpreted by `scaleType`
5. `noDataColor` for missing data
6. the existing idle/selected/hover colors when `values` is omitted

## Composition with theming

Choropleth mode reuses the existing theme surface:

| Value                       | Used for                                              |
| :-------------------------- | :---------------------------------------------------- |
| `colorScale` / `getColor`    | Value fill                                            |
| `noDataColor` / `--tm-no-data-color` | Provinces without a value                    |
| `--tm-hover-color`          | Hover outline                                         |
| `selectedStroke` / `selectedStrokeWidth` | Selected outline                          |
| `--tm-disabled-color`       | Disabled fill                                         |
| `--tm-stroke-color` / `--tm-stroke-width` | Idle outline                            |
| `--tm-focus-ring`           | Keyboard focus indicator                              |

See [Styling and DOM ids](./styling.md) for the full precedence and CSS-variable reference.

## Requirements

The feature adds no runtime dependencies and works with React >=16.8 and server rendering. Values are read without browser globals, and province interaction, selection, keyboard behavior, and ARIA semantics are unchanged.

## Related

- [Styling and DOM ids](./styling.md) — CSS variables, `customStyle`, and `getCityStyle`.
- [Tooltips](./tooltips.md) — `renderTooltip` receives the current value as its second argument.
- [API reference](./api.md#choropleth-props) — prop and type tables.
