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

### Zoom and pan props

| Property           | Description                                                                                   | Type                        | Default | Since |
| :----------------- | :-------------------------------------------------------------------------------------------- | :-------------------------- | :------ | ----: |
| `zoomable`         | Enables wheel, pinch, double-click, drag, keyboard zoom/pan, and the ref API.                  | `boolean`                   | `false` | 3.0.0 |
| `minZoom`          | Minimum viewport scale; must be finite and `>= 1`.                                             | `number`                    | `1`     | 3.0.0 |
| `maxZoom`          | Maximum viewport scale; values below `minZoom` are raised to `minZoom`.                        | `number`                    | `8`     | 3.0.0 |
| `zoomControls`     | Renders accessible zoom-in, zoom-out, and reset buttons. Requires `zoomable`.                  | `boolean`                   | `false` | 3.0.0 |
| `viewport`         | Controlled viewport. Translations are in SVG viewBox user units and are normalized.            | `Viewport`                  | -       | 3.0.0 |
| `onViewportChange` | Fires when a gesture or ref call changes the viewport. Does not fire on mount.                 | `OnViewportChangeCallback`  | -       | 3.0.0 |

The default export accepts a ref typed as `TurkeyMapRef`:

| Method                       | Description                                                                                         |
| :--------------------------- | :-------------------------------------------------------------------------------------------------- |
| `focusCity(cityId, zoom?)`   | Centers a province; the default zoom is `max(currentScale, 2)`, clamped to the zoom bounds.         |
| `zoomTo(scale)`              | Sets an absolute scale around the current viewport center.                                          |
| `resetView()`                | Returns to `minZoom` with the map centered.                                                         |

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

## Headless hook

`useTurkeyMap` is a named export from both `turkey-map-react` and `turkey-map-react/core`. It renders nothing, requires `data`, and accepts a city subtype generic so custom metadata flows through state, getters, and callbacks:

```ts
const result = useTurkeyMap<RegionCity>({ data, selectionMode: 'multiple' });
```

### Hook options

| Option                 | Description                                                                                              | Type                              | Default          |
| :--------------------- | :------------------------------------------------------------------------------------------------------- | :-------------------------------- | :--------------- |
| `data`                 | City data. Required; the hook never falls back to the built-in dataset.                                   | `Data<TCity>`                     | -                |
| `visible`              | Hides effective tooltip state when `false`.                                                               | `boolean`                         | `true`           |
| `hoverable`            | Enables `onHover` and hover callbacks.                                                                    | `boolean`                         | `true`           |
| `selectionMode`        | Selection mode shared with the component.                                                                 | `SelectionMode`                   | `"none"`         |
| `selectedCity`         | Controlled single selection id, or `null` to clear it.                                                    | `string \| null`                  | -                |
| `defaultSelectedCity`  | Initial uncontrolled single selection id.                                                                 | `string`                          | -                |
| `selectedCities`       | Controlled multiple selection ids.                                                                        | `string[]`                        | -                |
| `defaultSelectedCities`| Initial uncontrolled multiple selection ids.                                                              | `string[]`                        | -                |
| `maxSelection`         | Cap for multiple mode.                                                                                    | `number`                          | -                |
| `onSelect`             | Fires with the full city when an activation selects it.                                                   | `OnSelectCallback<TCity>`         | -                |
| `onSelectionChange`    | Fires with the complete selection whenever it changes.                                                    | `OnSelectionChangeCallback<TCity>`| -                |
| `onMaxSelectionReached`| Fires when an addition would exceed `maxSelection`.                                                       | `OnMaxSelectionReachedCallback<TCity>` | -            |
| `disabledCities`       | City ids treated as disabled.                                                                             | `string[]`                        | -                |
| `isCityDisabled`       | Predicate for disabled cities.                                                                            | `IsCityDisabledCallback<TCity>`   | -                |
| `onHover`              | Fires with `(city, event)` when a city is hovered.                                                       | `(city: TCity, event: MouseEvent<Element>) => void` | - |
| `onClick`              | Fires with `(city, event?)` on pointer activation; the event is omitted for keyboard activation in none mode. | `(city: TCity, event?: MouseEvent<Element>) => void` | - |
| `showTooltip`          | Opts into tooltip state and props.                                                                        | `boolean`                         | `false`          |
| `tooltipPosition`      | Anchors the tooltip to the pointer or the active city.                                                    | `TooltipPosition`                 | `"cursor"`       |
| `tooltipPortal`        | Uses fixed/client coordinates for a consumer-rendered portal.                                             | `boolean`                         | `false`          |
| `tooltipOffset`        | Distance between the anchor and the tooltip.                                                              | `number`                          | `16`             |
| `tooltipDelay`         | Hover-intent delay in milliseconds.                                                                       | `number`                          | `80`             |
| `tooltipAnimationName` | Advanced: lets a consumer render matching keyframes for the component-style fade-out.                     | `string`                          | -                |
| `tooltipRefreshKey`    | Advanced: re-anchors a visible city tooltip when rendered geometry changes, such as a zoom viewport.      | `unknown`                         | -                |
| `ariaLabel`            | Accessible name for the container props.                                                                  | `string`                          | `"Turkey map"`   |

### Hook result

| Field                     | Description                                                                                          |
| :------------------------ | :--------------------------------------------------------------------------------------------------- |
| `selectedCities`          | Effective selection as full `TCity[]` objects in first-occurrence order.                             |
| `selectedIds`             | Effective selection city ids.                                                                        |
| `rovingCityId`            | The city that currently owns `tabIndex={0}`.                                                         |
| `focusedCityId`           | The focused city id, or `undefined`.                                                                 |
| `tooltipCity`             | The hovered/focused city when the tooltip is active, or `undefined`.                                 |
| `tooltipVisible`          | Effective tooltip visibility, including `visible={false}`.                                           |
| `announcement`            | Text for a consumer-rendered polite live region.                                                     |
| `isCityDisabled(city)`    | Resolves the effective disabled state from `disabledCities`, `city.disabled`, and `isCityDisabled`.   |
| `activateCity(city)`      | Applies a pointer-equivalent activation.                                                             |
| `changeSelection(ids)`    | Applies a native-select-style selection value with normalization, caps, callbacks, and announcements. |
| `clearSelection()`        | Clears the selection without firing `onSelect`.                                                      |
| `getContainerProps()`     | Returns `role`, `aria-label`, `aria-multiselectable`, and the container marker.                       |
| `getCityProps(city)`      | Returns role, accessible name, selected/disabled state, `tabIndex`, the city marker, and event handlers. |
| `getTooltipProps()`       | Returns `role="tooltip"`, `aria-hidden` while hidden, positioning style, and `pointer-events: none`.  |
| `cityHandlers`            | Advanced stable imperative handlers for composing local interaction state.                            |
| `registerCityHoverClear`  | Advanced hook for clearing a custom city shell's local hover state.                                   |

`getContainerProps()` must be applied to the ancestor that contains every city. `getCityProps(city)` must be applied to the element that represents that city. `getTooltipProps()` does not render content or a portal.

### Advanced handlers

`cityHandlers` is stable and uses the same city argument ordering as the component's internals: `onEnter(city, element, point)`, `onLeave(city)`, `onMove(city, element, point)`, `onHover(city, event)`, `onClick(city, event)`, `onActivate(city, event?)`, `onKeyDown(city, event)`, `onFocus(city, element)`, and `onBlur(city)`.

## Generic city types

`TurkeyMap`, `CoreTurkeyMap`, `TurkeyMapProps`, `CoreProps`, `Data`, and the callback/helper types are generic over a city subtype that extends `CityType`. The default is `CityType`, so existing untyped usage is unchanged. Use `Omit<CityType, "meta">` to replace the wide metadata record with your own shape:

```tsx
import TurkeyMap, { CityType, Data } from "turkey-map-react";

type SalesCity = Omit<CityType, "meta"> & { meta: { sales: number } };

const salesData: Data<SalesCity> = {
  cities: [
    {
      id: "ankara",
      plateNumber: 6,
      name: "Ankara",
      path: "M 0 0 L 10 10 L 0 10 Z",
      meta: { sales: 1200 },
    },
  ],
};

<TurkeyMap<SalesCity>
  data={salesData}
  onHover={(city) => console.log(city.meta.sales)}
/>;
```

The same generic works with `CoreTurkeyMap<SalesCity>` and `useTurkeyMap<SalesCity>`. A custom city type should be paired with matching `data`; the root entry's built-in fallback only guarantees the base `CityType` fields.

## Types

| Type                            | Description                                                                                                                  |
| :------------------------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| `CityType`                      | `{ id: string, plateNumber: number, name: string, path: string, disabled?: boolean, region?: Region, centroid?: Centroid, neighbors?: string[], areaKm2?: number, population?: number, isoCode?: string, nutsCode?: string, altNames?: string[], meta?: Record<string, unknown> }` |
| `Region`                        | `"marmara" \| "ege" \| "akdeniz" \| "ic-anadolu" \| "karadeniz" \| "dogu-anadolu" \| "guneydogu-anadolu"`                    |
| `Centroid`                      | `{ x: number, y: number }` in the same SVG user-unit space as `path`                                                        |
| `Data<TCity extends CityType = CityType>` | `{ cities: TCity[] }`                                                                                              |
| `ViewBoxType`                   | `{ top: number, left: number, width: number, height: number }`                                                               |
| `CustomStyleType`               | `{ idleColor: string, hoverColor: string, selectedColor?: string, selectedStroke?: string, selectedStrokeWidth?: number, disabledColor?: string, strokeColor?: string, strokeWidth?: number, focusStroke?: string, focusStrokeWidth?: number }` |
| `CityInteractionState`          | `{ hovered: boolean, selected: boolean, disabled: boolean, focused: boolean }`                                              |
| `CityStyleGetter<TCity extends CityType = CityType>` | `(city: TCity, state: CityInteractionState) => React.CSSProperties \| undefined`                                  |
| `ChoroplethValues`              | `Record<string, number>`                                                                                                     |
| `ColorScale`                    | `string[] \| ColorScaleFunction`                                                                                             |
| `ColorScaleFunction`            | `(value: number) => string`                                                                                                  |
| `ScaleType`                     | `"linear" \| "quantize" \| "quantile" \| "threshold"`                                                                        |
| `GetColorCallback<TCity extends CityType = CityType>` | `(value: number, city: TCity) => string`                                                                      |
| `SelectionMode`                 | `"none" \| "single" \| "multiple"`                                                                                            |
| `SelectionValue`                | `string \| string[] \| null`                                                                                                 |
| `IsCityDisabledCallback<TCity extends CityType = CityType>` | `(city: TCity) => boolean`                                                                                        |
| `TooltipPosition`               | `"cursor" \| "city"`                                                                                                          |
| `RenderTooltipCallback<TCity extends CityType = CityType>` | `(city: TCity, value?: unknown) => React.ReactNode`                                                                |
| `OnSelectCallback<TCity extends CityType = CityType>` | `(city: TCity) => void`                                                                                                |
| `OnSelectionChangeCallback<TCity extends CityType = CityType>` | `(cities: TCity[]) => void`                                                                                    |
| `OnMaxSelectionReachedCallback<TCity extends CityType = CityType>` | `(city: TCity, selectedCities: TCity[], maxSelection: number) => void`                                    |
| `Viewport`                      | `{ scale: number, translateX: number, translateY: number }` — translations are in SVG viewBox user units.                    |
| `OnViewportChangeCallback`      | `(viewport: Viewport) => void`                                                                                               |
| `TurkeyMapRef`                  | `{ focusCity(cityId: string, zoom?: number): void, zoomTo(scale: number): void, resetView(): void }`                         |
| `UseTurkeyMapOptions<TCity extends CityType = CityType>` | Hook options; `data` is required.                                                                               |
| `UseTurkeyMapResult<TCity extends CityType = CityType>`  | Hook state, actions, getters, and advanced composition helpers.                                                 |
| `UseTurkeyMapContainerProps`    | `{ role, "aria-label", "aria-multiselectable"?, "data-tm-map-container" }`                                                    |
| `UseTurkeyMapCityProps`         | Role, accessible name, selected/disabled state, `tabIndex`, `data-tm-city-id`, and pointer/mouse/keyboard/focus handlers.     |
| `UseTurkeyMapTooltipProps`      | `{ role: "tooltip", "aria-hidden"?, style }`                                                                                 |
| `UseTurkeyMapHandlers<TCity extends CityType = CityType>` | Advanced stable imperative city handlers.                                                                       |
| `UseTurkeyMapPoint`             | `{ pageX: number, pageY: number, clientX: number, clientY: number }`                                                         |
