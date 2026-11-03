# API reference

Every prop and exported TypeScript type.

[Back to README](../readme.md) · [Getting started](./getting-started.md) · [Selection and forms](./selection.md)

## Props

### Layout and container

| Property        | Description                                                                 | Type                                       | Default                                                          | Since |
| :-------------- | :-------------------------------------------------------------------------- | :----------------------------------------- | :--------------------------------------------------------------- | ----: |
| `viewBox`       | Position and dimension information of the map (SVG) layout.                 | `ViewBoxType`                              | `{ top: 0, left: 80, width: 1050, height: 585 }`                 | 1.0.0 |
| `visible`       | Defines the visibility of the component.                                    | `boolean`                                  | `true`                                                           | 1.0.0 |
| `id`            | Root container id; SVG, tooltip, and province group ids are derived from it. | `string`                                   | Legacy ids                                                       | 2.4.0 |
| `className`     | Extra class name(s) for the root container.                                 | `string`                                   | -                                                                | 2.4.0 |
| `style`         | Inline styles for the root container, including `--tm-*` variables.         | `React.CSSProperties`                      | Container defaults                                               | 2.4.0 |
| `containerProps`| Additional attributes and event handlers for the root container.            | `React.HTMLAttributes<HTMLDivElement>`     | -                                                                | 2.4.0 |
| `svgProps`      | Additional attributes and event handlers for the root SVG.                  | `React.SVGAttributes<SVGSVGElement>`       | -                                                                | 2.4.0 |

### Data and interaction

| Property         | Description                                                              | Type                                                                          | Default                       | Since |
| :--------------- | :----------------------------------------------------------------------- | :---------------------------------------------------------------------------- | :---------------------------- | ----: |
| `data`           | Allows for providing custom SVG paths and metadata. Required on `turkey-map-react/core`; optional on the root entry. | `Data`                                                                        | Built-in dataset (root only)  | 1.0.0 |
| `hoverable`      | Enables `onHover` event availability.                                    | `boolean`                                                                     | `true`                        | 1.0.0 |
| `cityWrapper`    | City DOMs are wrapped by the provided component.                         | `(cityComponent: JSX.Element, city: CityType) => JSX.Element`                 | Unwrapped city                | 1.0.0 |
| `disabledCities` | City ids rendered as disabled. Unknown ids are ignored.                  | `string[]`                                                                    | -                             | 2.3.0 |
| `isCityDisabled` | Predicate that marks a city as disabled (also works with custom data).   | `IsCityDisabledCallback`                                                      | -                             | 2.3.0 |
| `onHover`        | Fires when a city is hovered on the map.                                 | `(city: CityType) => void`                                                    | -                             | 1.0.0 |
| `onClick`        | Fires when a city is clicked on the map.                                 | `(city: CityType) => void`                                                    | -                             | 1.0.0 |

### Choropleth props

| Property        | Description                                                                                  | Type               | Default                                | Since |
| :-------------- | :------------------------------------------------------------------------------------------- | :----------------- | :------------------------------------- | ----: |
| `values`        | Numeric metric values keyed by city id. Supplying it activates choropleth coloring.          | `ChoroplethValues` | -                                      | 2.6.0 |
| `colorScale`    | Color stops interpreted by `scaleType`, or a function that maps a raw value to a color.     | `ColorScale`       | `["#f7fbff", "#08306b"]`               | 2.6.0 |
| `scaleType`     | Scale used for the array `colorScale`: `"linear"`, `"quantize"`, `"quantile"`, or `"threshold"`. | `ScaleType`    | `"linear"`                             | 2.6.0 |
| `thresholds`    | Ascending bucket boundaries for `scaleType="threshold"`; needs `thresholds.length + 1` colors. | `number[]`       | -                                      | 2.6.0 |
| `noDataColor`   | Fill for provinces without a finite value. Overrides `--tm-no-data-color`.                    | `string`           | `var(--tm-no-data-color, #eeeeee)`     | 2.6.0 |
| `getColor`      | Per-province color escape hatch; wins over `colorScale` for provinces with a value.          | `GetColorCallback` | -                                      | 2.6.0 |
| `animateValues` | Transitions province fills when values change, unless reduced motion is preferred.           | `boolean`          | `false`                                | 2.6.0 |

### Selection props

| Property               | Description                                                              | Type                                | Default  | Since |
| :--------------------- | :----------------------------------------------------------------------- | :---------------------------------- | :------- | ----: |
| `selectionMode`        | Enables single or multiple selection. `onClick` / `onHover` still fire.   | `SelectionMode`                     | `"none"` | 2.2.0 |
| `selectedCity`         | Controlled single selection id, or `null` to clear it.                   | `string \| null`                    | -        | 2.2.0 |
| `defaultSelectedCity`  | Initial uncontrolled single selection id.                                | `string`                            | -        | 2.2.0 |
| `selectedCities`       | Controlled multiple selection ids. An empty array clears the selection.  | `string[]`                          | -        | 2.2.0 |
| `defaultSelectedCities`| Initial uncontrolled multiple selection ids.                             | `string[]`                          | -        | 2.2.0 |
| `maxSelection`         | Caps the number of selected cities in multiple mode.                     | `number`                            | -        | 2.2.0 |
| `onSelect`             | Fires with the full city when an activation selects it.                  | `OnSelectCallback`                  | -        | 2.2.0 |
| `onSelectionChange`    | Fires with the complete selection whenever it changes.                   | `OnSelectionChangeCallback`         | -        | 2.2.0 |
| `onMaxSelectionReached`| Fires when an addition would exceed `maxSelection`.                      | `OnMaxSelectionReachedCallback`     | -        | 2.2.0 |

### Tooltip props

| Property             | Description                                                           | Type                    | Default      | Since |
| :------------------- | :-------------------------------------------------------------------- | :---------------------- | :----------- | ----: |
| `showTooltip`        | Displays the default tooltip if set to `true`.                        | `boolean`               | `false`      | 1.1.0 |
| `tooltipText`        | Sets custom text for the default tooltip.                             | `string`                | City name    | 1.1.0 |
| `disabledTooltipText`| Tooltip text shown when a disabled city is hovered. Falls back to its name. | `string`          | City name    | 2.3.0 |
| `renderTooltip`      | Renders custom tooltip content; the second argument is the current choropleth value, or `undefined`. Takes precedence over all text fallbacks. | `RenderTooltipCallback` | -          | 2.2.0 |
| `tooltipPosition`    | Anchors the tooltip to the pointer or the hovered/focused province.   | `TooltipPosition`       | `"cursor"`   | 2.2.0 |
| `tooltipPortal`      | Renders the tooltip into `document.body` to escape clipping ancestors. | `boolean`              | `false`      | 2.2.0 |
| `tooltipOffset`      | Distance in pixels between the anchor and the tooltip.                | `number`                | `16`         | 2.2.0 |
| `tooltipDelay`       | Hover-intent delay in milliseconds for revealing and leaving the tooltip. | `number`            | `80`         | 2.2.0 |

### Styling and accessibility props

| Property      | Description                                                                 | Type                   | Default                        | Since |
| :------------ | :-------------------------------------------------------------------------- | :--------------------- | :----------------------------- | ----: |
| `customStyle` | Per-map color and stroke overrides. Values win over CSS custom properties.  | `CustomStyleType`      | CSS variables (see [Styling](./styling.md)) | 1.0.0 |
| `getCityStyle`| Per-province style callback. Runs for every province on every render.       | `CityStyleGetter`      | -                              | 2.4.0 |
| `ariaLabel`   | Accessible name for the province container.                                 | `string`               | `"Turkey map"`                 | 2.5.0 |
| `a11yFallback`| Renders a visually hidden native select synchronized with selection.        | `boolean`              | `false`                        | 2.5.0 |

## Types

| Type                            | Description                                                                                                                  |
| :------------------------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| `CityType`                      | `{ id: string, plateNumber: number, name: string, path: string, disabled?: boolean }`                                        |
| `Data`                          | `{ cities: CityType[] }`                                                                                                     |
| `ViewBoxType`                   | `{ top: number, left: number, width: number, height: number }`                                                               |
| `CustomStyleType`               | `{ idleColor: string, hoverColor: string, selectedColor?: string, selectedStroke?: string, selectedStrokeWidth?: number, disabledColor?: string, strokeColor?: string, strokeWidth?: number, focusStroke?: string, focusStrokeWidth?: number }` |
| `CityInteractionState`          | `{ hovered: boolean, selected: boolean, disabled: boolean, focused: boolean }`                                              |
| `CityStyleGetter`               | `(city: CityType, state: CityInteractionState) => React.CSSProperties \| undefined`                                          |
| `ChoroplethValues`              | `Record<string, number>`                                                                                                     |
| `ColorScale`                    | `string[] \| ColorScaleFunction`                                                                                             |
| `ColorScaleFunction`            | `(value: number) => string`                                                                                                  |
| `ScaleType`                     | `"linear" \| "quantize" \| "quantile" \| "threshold"`                                                                        |
| `GetColorCallback`              | `(value: number, city: CityType) => string`                                                                                  |
| `SelectionMode`                 | `"none" \| "single" \| "multiple"`                                                                                            |
| `SelectionValue`                | `string \| string[] \| null`                                                                                                 |
| `IsCityDisabledCallback`        | `(city: CityType) => boolean`                                                                                                |
| `TooltipPosition`               | `"cursor" \| "city"`                                                                                                          |
| `RenderTooltipCallback`         | `(city: CityType, value?: unknown) => React.ReactNode`                                                                       |
| `OnSelectCallback`              | `(city: CityType) => void`                                                                                                   |
| `OnSelectionChangeCallback`     | `(cities: CityType[]) => void`                                                                                               |
| `OnMaxSelectionReachedCallback` | `(city: CityType, selectedCities: CityType[], maxSelection: number) => void`                                                  |
