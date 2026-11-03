# Interactive Turkey Map React Component

An out-of-the-box city map of Turkey.

Live demo : https://turkey-map-react-demo.netlify.app/

## Installation

```javascript
npm install turkey-map-react
```

or

```javascript
yarn add turkey-map-react
```

## Note about React

This package declares React as a peer dependency and does not bundle React into the published build. The host application must provide React (version >=16.8). The package is built to be compatible with React 16/17/18/19 — your application’s React installation will be used at runtime, avoiding duplicate React instances and version conflicts.

## Usage

### Importing (ES6)

```javascript
import TurkeyMap from 'turkey-map-react';
```

### Entry points

The package publishes three entry points so applications can choose what they bundle:

| Entry point                 | What it provides                                                                 | When to use it                                                        |
| :-------------------------- | :------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| `turkey-map-react`          | The default `TurkeyMap` component plus the built-in 81-province dataset.         | You want the one-line `<TurkeyMap />` map.                            |
| `turkey-map-react/core`     | The same component without the built-in dataset. `data` is required.             | You supply your own `data` and want the dataset out of your bundle.   |
| `turkey-map-react/data`     | The built-in dataset as a named `cities` export.                                 | You want to read, filter, or extend the built-in provinces yourself.  |

Root entry (default, data-backed):

```javascript
import TurkeyMap from 'turkey-map-react';

<TurkeyMap />;
```

Core entry (custom data, no built-in dataset):

```javascript
import TurkeyMap from 'turkey-map-react/core';

const myCities = [
  { id: 'alpha', plateNumber: 1, name: 'Alpha', path: 'M 0 0 L 10 10 Z' },
];

<TurkeyMap data={{ cities: myCities }} />;
```

Data entry (built-in dataset):

```javascript
import { cities } from 'turkey-map-react/data';

const provinceNames = cities.map((city) => city.name);
```

Bundle-size implications: the root entry includes the built-in dataset and is roughly 85 kB gzipped. The `core` entry is roughly 3 kB gzipped and contains no province paths, so its final size depends only on the data you pass. The `data` entry carries the dataset alone (roughly 81 kB gzipped) and can be imported without pulling in the component implementation or React. Using `turkey-map-react/core` with your own data is the smallest option when you do not need the built-in map.

### Basic usage with defaults

```javascript
<TurkeyMap />
```

### Handling events

On click example:

```javascript
<TurkeyMap onClick={ ({ plateNumber, name }) => console.log(plateNumber + " - " + name + " is just clicked!") } />
```

On mouse over example:

```javascript
<TurkeyMap 
    hoverable={true}
    onHover={ ({ plateNumber, name }) => console.log("Cursor is over on " + plateNumber + " - " + name + "!") } 
/>
```

### Selecting cities

Selection is opt-in through `selectionMode` (`"none"` by default). Both controlled and uncontrolled forms are available.

Single selection, uncontrolled:

```javascript
<TurkeyMap
  selectionMode="single"
  defaultSelectedCity="istanbul"
  onSelectionChange={(cities) => console.log(cities.map((city) => city.id))}
/>
```

Single selection, controlled (`null` clears the selection):

```javascript
const [cityId, setCityId] = useState(null);

<TurkeyMap
  selectionMode="single"
  selectedCity={cityId}
  onSelectionChange={([city]) => setCityId(city ? city.id : null)}
/>
```

Multiple selection, controlled, with a limit:

```javascript
const [cityIds, setCityIds] = useState(['ankara', 'istanbul']);

<TurkeyMap
  selectionMode="multiple"
  selectedCities={cityIds}
  maxSelection={3}
  onSelectionChange={(cities) => setCityIds(cities.map((city) => city.id))}
  onMaxSelectionReached={(city, selectedCities, maxSelection) => {
    console.log(`${city.name} was not added; ${selectedCities.length}/${maxSelection} selected`);
  }}
/>
```

Use `defaultSelectedCities` for uncontrolled multiple selection. `selectedCity`, `selectedCities`, `defaultSelectedCity`, and `defaultSelectedCities` are primitive id values, so they can be bound directly to a form field. `onSelect` receives the full `CityType` for the city that was just selected; `onSelectionChange` always receives the complete selection as an array (zero or one item in single mode).

Selected cities use `selectedColor`, `selectedStroke`, and `selectedStrokeWidth` from `customStyle`:

```javascript
<TurkeyMap
  selectionMode="single"
  selectedCity="ankara"
  customStyle={{
    idleColor: '#444',
    hoverColor: '#dc3522',
    selectedColor: '#1a73e8',
    selectedStroke: '#0b3d91',
    selectedStrokeWidth: 2,
  }}
/>
```

When `maxSelection` is reached, additional selections are ignored and `onSelectionChange` does not fire. Removing a selected city is always allowed. If `onMaxSelectionReached` is not supplied, development builds log a `console.warn`. Invalid limits (zero, negative, or non-integers) are ignored with a development warning.

### Form integration

The selection value is a plain id (or `null`) for single mode and an id array for multiple mode:

```javascript
// react-hook-form
const { field } = useController({ name: 'province' });

<TurkeyMap
  selectionMode="single"
  selectedCity={field.value ?? null}
  onSelectionChange={([city]) => field.onChange(city ? city.id : null)}
/>
```

```javascript
// Formik
<Field name="province">
  {({ field, form }) => (
    <TurkeyMap
      selectionMode="single"
      selectedCity={field.value ?? null}
      onSelectionChange={([city]) => form.setFieldValue('province', city ? city.id : null)}
    />
  )}
</Field>
```

For server actions, submit the same primitive value (`string | null` or `string[]`). When you need full city metadata, map the callbacks with `cities.map((city) => city.id)` or read the entries directly.

### City component wrapping

```javascript
const renderCity = (cityComponent, cityData) => ( 
  <Tooltip title={cityData.name} key={cityData.id}> 
      {cityComponent} 
  </Tooltip>
);

<TurkeyMap cityWrapper={renderCity} />
```

This is generally used for [Antd](https://ant.design/components/tooltip/) style *Tooltip*.

"*child*" parameter is the city DOM.

### Custom Data

```javascript
<TurkeyMap data={{ cities: this.state.apiData }} />
```

If custom SVG paths and/or city metadata is needed to be rendered, it can be provided through *data* property.

*data* property has to be in type of following:

```javascript
{ cities: CityType[] }
```

where each city is:

```javascript
{ id: string, plateNumber: number, name: string, path: string, disabled?: boolean }
```

The root entry falls back to the built-in dataset when `data` is omitted. The `turkey-map-react/core` entry does not: it requires `data` in TypeScript, and plain JavaScript that omits it renders no provinces.

### Disabling cities

Provinces can be disabled through three additive sources: a list of ids, a predicate, or a per-city flag in custom data.

```javascript
// 1. Disable by city id
<TurkeyMap disabledCities={['hakkari', 'sirnak']} />

// 2. Disable with a predicate (works with custom data)
const customCities = [
  { id: 'alpha', plateNumber: 1, name: 'Alpha', path: '...' },
];

<TurkeyMap
  data={{ cities: customCities }}
  isCityDisabled={(city) => city.name === 'Alpha'}
/>

// 3. Disable from the dataset
const citiesWithDisabled = [
  { id: 'alpha', plateNumber: 1, name: 'Alpha', path: '...', disabled: true },
];
```

A city is disabled when any source marks it disabled. Unknown ids in `disabledCities` are ignored, and offering the same id more than once has no additional effect.

Disabled provinces stay rendered and discoverable, but ignore pointer and keyboard activation: `onHover`, `onClick`, `onSelect`, `onSelectionChange`, and `onMaxSelectionReached` do not fire. They use `disabledColor` (default `#e5e5e5`), `cursor: not-allowed`, and `aria-disabled="true"`. Disabled styling wins over hover and selected styling.

```javascript
<TurkeyMap
  selectionMode="multiple"
  selectedCities={['ankara']}
  disabledCities={['hakkari', 'sirnak']}
  showTooltip={true}
  disabledTooltipText="Not available"
  customStyle={{
    idleColor: '#444',
    hoverColor: '#dc3522',
    disabledColor: '#e5e5e5',
  }}
/>
```

In selection modes and in `"none"` mode, disabled provinces remain keyboard focusable so assistive technology can announce them; Enter/Space performs no activation.

Selection values are never filtered. If a selected city becomes disabled it stays in `selectedCity` / `selectedCities` and in `onSelectionChange` payloads, but it cannot be deselected from the map until it is re-enabled or the controlled value is updated.

### Accessibility

The map is keyboard operable and exposes selection semantics without any extra configuration.

The province container (`<g id="turkiye">`) is a labeled `listbox` in `"single"` and `"multiple"` modes, and a labeled `group` in `"none"` mode. `ariaLabel` overrides its accessible name; the default is `"Turkey map"`. In multiple mode the container also exposes `aria-multiselectable="true"`. Every province is named `"<name>, plate <plateNumber>"` (for example `"İstanbul, plate 34"`) and exposes `role="option"` with `aria-selected` in selection modes, or `role="button"` without `aria-selected` in `"none"` mode. Disabled provinces keep `aria-disabled="true"` and their accessible name.

The whole map is a single tab stop. Tab enters the selected province when there is a selection, otherwise the first enabled province; every other province has `tabindex="-1"`. This also applies to `selectionMode="none"`, which is the one intentional keyboard behavior change in this release. Disabled provinces stay in the roving order so screen readers can announce them, but activation is inert.

| Key                          | Action                                                              |
| :--------------------------- | :------------------------------------------------------------------ |
| `ArrowRight` / `ArrowDown`   | Move focus to the next province in data order.                      |
| `ArrowLeft` / `ArrowUp`      | Move focus to the previous province in data order.                  |
| `Home` / `End`               | Move focus to the first or last province.                           |
| `Enter` / `Space`            | Select or toggle the focused province, or call `onClick` in `"none"` mode. |
| `Escape`                     | Clear the selection without firing `onSelect`.                      |

Navigation stops at the first and last province rather than wrapping. In controlled selection, Escape reports the clear through `onSelectionChange([])` and the parent remains responsible for updating the value.

A visually hidden polite live region announces the focused province, including selected and disabled state, plus selection changes and clearing. Hover does not write to the live region.

The focus ring is visible in every mode, including `"none"`. It defaults to a 2px `#1a73e8` outline and can be customized through `customStyle.focusStroke` and `customStyle.focusStrokeWidth`. The outline color also reads the `--tm-focus-ring` CSS custom property when defined.

#### Native select fallback

Set `a11yFallback` in a selection mode to render a visually hidden native `<select>` for assistive technology and form tooling. It mirrors the effective selection, disables options for disabled provinces, and routes changes through the same selection callbacks and `maxSelection` rules as the map. It is off by default and ignored with a development warning in `"none"` mode.

```javascript
<TurkeyMap
  selectionMode="multiple"
  selectedCities={selectedCityIds}
  onSelectionChange={(cities) => setSelectedCityIds(cities.map((city) => city.id))}
  a11yFallback
/>
```

#### Customizing the focus ring

```javascript
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

### Custom tooltips

`showTooltip` remains the opt-in switch. When it is omitted, no tooltip markup or keyframes are rendered, and every new tooltip prop is inert. With `showTooltip={true}` and no other tooltip props, the built-in text tooltip, its DOM id, fade-out animation, and positioning are unchanged.

#### Custom content

```javascript
import TurkeyMap, { RenderTooltipCallback } from 'turkey-map-react';

const renderTooltip: RenderTooltipCallback = (city, value) => (
  <div>
    <strong>{city.name}</strong>
    <span>Plate {city.plateNumber}</span>
  </div>
);

<TurkeyMap showTooltip={true} renderTooltip={renderTooltip} />;
```

`renderTooltip` takes precedence over `tooltipText`, `disabledTooltipText`, and the province-name fallback, including for disabled provinces. The second `value` argument is reserved for a future data API and is always `undefined` in this release. A `null`, `false`, or empty return value renders an empty tooltip container without throwing.

The tooltip surface uses `pointer-events: none`, so custom content must not rely on hover, focus, or click interaction. Avoid placing interactive controls inside it.

#### Cursor or province anchoring

```javascript
// Follow the pointer (default). The tooltip sits 16px right and 32px above it.
<TurkeyMap showTooltip={true} />

// Anchor above the hovered or focused province instead.
<TurkeyMap showTooltip={true} tooltipPosition="city" />
```

In city mode the tooltip is centered above the province's rendered bounds, separated by `tooltipOffset` pixels. City anchors are computed when the tooltip is revealed or the active province changes; they are not updated on scroll or resize, and no viewport collision detection or flipping is included.

#### Portals for clipping containers

```javascript
<div style={{ overflow: 'hidden', height: 400 }}>
  <TurkeyMap showTooltip={true} tooltipPortal={true} />
</div>
```

`tooltipPortal` renders the tooltip as a direct child of `document.body`, keeping the same id, content, visibility, and accessibility attributes. It escapes ancestor `overflow: hidden`, works in server rendering without touching `document`, and is removed on unmount or when the prop becomes `false`. The legacy `#svg-turkiye-haritasi-container-tooltip` id is preserved in both modes; with a custom map `id`, the tooltip id is derived from it. Portal mode uses `position: fixed` with client coordinates, keeps `zIndex: 1`, and can still leave the viewport near edges.

#### Offset and hover-intent delay

```javascript
<TurkeyMap
  showTooltip={true}
  tooltipOffset={8}   // 8px right, 16px above in cursor mode
  tooltipDelay={120}  // wait before the first reveal and before hiding
/>
```

`tooltipOffset` defaults to `16`; `NaN`, `Infinity`, or a non-numeric runtime value falls back to the default, and negative values are treated as `0`.

`tooltipDelay` defaults to `80` ms and acts as both the reveal delay and the leave grace period. The grace period prevents flicker when crossing adjacent provinces and brief empty gaps. `tooltipDelay={0}` restores immediate showing and hiding. A non-finite delay falls back to `80`, and a negative delay is treated as `0`.

#### Reduced motion and keyboard focus

The tooltip respects `prefers-reduced-motion: reduce`: when reduced motion is requested, hiding is immediate and the fade animation is not applied. The keyframe definition remains in the document for backward compatibility. When `window.matchMedia` is unavailable (including server rendering), the tooltip uses the non-animated behavior. The media-query listener is cleaned up on unmount.

When `showTooltip` is enabled, keyboard focus reveals the tooltip immediately for the focused province, anchored to that province regardless of `tooltipPosition`. Blurring returns the tooltip to a hovered province when one is active, otherwise it hides. Focus-triggered tooltips work in every mode, including `"none"` mode where the map now has a single roving tab stop, and the tooltip shell itself is not focusable.

## API

### Types

| Type                             | Description                                                                                                                  |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| *CityType*                       | { **id**: *string*, **plateNumber**: *number*, **name**: *string*, **path**: *string*, **disabled**?: *boolean* }            |
| *Data*                           | { **cities**: *CityType*[] }                                                                                                 |
| *ViewBoxType*                    | { **top**: *number*, **left**: *number*, **width**: *number*, **height**: *number* }                                         |
| *CustomStyleType*                | { **idleColor**: *string*, **hoverColor**: *string*, **selectedColor**?: *string*, **selectedStroke**?: *string*, **selectedStrokeWidth**?: *number*, **disabledColor**?: *string*, **strokeColor**?: *string*, **strokeWidth**?: *number*, **focusStroke**?: *string*, **focusStrokeWidth**?: *number* } |
| *CityInteractionState*           | { **hovered**: *boolean*, **selected**: *boolean*, **disabled**: *boolean*, **focused**: *boolean* }                         |
| *CityStyleGetter*                | ( **city**: *CityType*, **state**: *CityInteractionState* ) => *React.CSSProperties \| undefined*                           |
| *SelectionMode*                  | `"none" \| "single" \| "multiple"`                                                                                           |
| *SelectionValue*                 | `string \| string[] \| null`                                                                                                 |
| *IsCityDisabledCallback*         | ( **city**: *CityType* ) => *boolean*                                                                                        |
| *TooltipPosition*                | `"cursor" \| "city"`                                                                                                         |
| *RenderTooltipCallback*          | ( **city**: *CityType*, **value**?: *unknown* ) => *React.ReactNode*                                                         |
| *OnSelectCallback*               | ( **city**: *CityType* ) => *void*                                                                                           |
| *OnSelectionChangeCallback*      | ( **cities**: *CityType*[] ) => *void*                                                                                       |
| *OnMaxSelectionReachedCallback*  | ( **city**: *CityType*, **selectedCities**: *CityType*[], **maxSelection**: *number* ) => *void*                              |

### props

| Property             | Description                                                                 | Type                                                                         | Default                                                                | Since |
| :------------------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------------------------- | :--------------------------------------------------------------------- | ----: |
| viewBox              | Position and dimension information of the map (svg) layout                  | *ViewBoxType*                                                                | { **top**: *0*, **left**: *80*, **width**: *1050*, **height**: *585* } | 1.0.0 |
| visible              | Defines the visibility of the component                                     | *boolean*                                                                    | *true*                                                                 | 1.0.0 |
| hoverable            | Enables *onHover* event availability                                        | *boolean*                                                                    | *true*                                                                 | 1.0.0 |
| showTooltip          | Displays default tooltip if set to true                                     | *boolean*                                                                    | *false*                                                                | 1.1.0 |
| tooltipText          | Sets custom text to default tooltip                                         | *string*                                                                     | *City Name*                                                            | 1.1.0 |
| renderTooltip        | Renders custom tooltip content. Takes precedence over all text fallbacks.   | *RenderTooltipCallback*                                                      | -                                                                      | 2.2.0 |
| tooltipPosition      | Anchors the tooltip to the pointer or the hovered/focused province.          | *TooltipPosition*                                                            | *"cursor"*                                                             | 2.2.0 |
| tooltipPortal        | Renders the tooltip into `document.body` to escape clipping ancestors.       | *boolean*                                                                    | *false*                                                                | 2.2.0 |
| tooltipOffset        | Distance in pixels between the anchor and the tooltip.                       | *number*                                                                     | *16*                                                                   | 2.2.0 |
| tooltipDelay         | Hover-intent delay in milliseconds for revealing and leaving the tooltip.    | *number*                                                                     | *80*                                                                   | 2.2.0 |
| customStyle          | Per-map color and stroke overrides. Values win over CSS custom properties.  | *CustomStyleType*                                                            | CSS variables (see [Styling](#styling))                                | 1.0.0 |
| className            | Extra class name(s) for the root container.                                 | *string*                                                                     | -                                                                      | 2.4.0 |
| style                | Inline styles for the root container, including `--tm-*` variables.          | *React.CSSProperties*                                                        | Container defaults                                                     | 2.4.0 |
| id                   | Root container id; SVG, tooltip, and province group ids are derived from it. | *string*                                                                     | Legacy ids                                                             | 2.4.0 |
| containerProps       | Additional attributes and event handlers for the root container.             | *React.HTMLAttributes<HTMLDivElement>*                                       | -                                                                      | 2.4.0 |
| svgProps             | Additional attributes and event handlers for the root SVG.                   | *React.SVGAttributes<SVGSVGElement>*                                         | -                                                                      | 2.4.0 |
| getCityStyle         | Per-province style callback. Runs for every province on every render.        | *CityStyleGetter*                                                            | -                                                                      | 2.4.0 |
| ariaLabel            | Accessible name for the province container.                                 | *string*                                                                     | *"Turkey map"*                                                         | 2.5.0 |
| a11yFallback         | Renders a visually hidden native select synchronized with selection.        | *boolean*                                                                    | *false*                                                                | 2.5.0 |
| data                 | Allows for providing custom SVG paths and metadata. Required on `turkey-map-react/core`; optional on the root entry. | *Data*                                                                       | *Built-in dataset (root only)*                                         | 1.0.0 |
| disabledCities       | City ids rendered as disabled. Unknown ids are ignored.                     | *string*[]                                                                   | -                                                                      | 2.3.0 |
| isCityDisabled       | Predicate that marks a city as disabled (also works with custom data).      | *IsCityDisabledCallback*                                                     | -                                                                      | 2.3.0 |
| disabledTooltipText  | Tooltip text shown when a disabled city is hovered. Falls back to its name. | *string*                                                                     | *City Name*                                                            | 2.3.0 |
| cityWrapper          | City DOMs are wrapped by provided component.                                | ( **cityComponent**: *JSX.Element*, **city** : *CityType* ) => *JSX.Element* | *Unwrapped city*                                                       | 1.0.0 |
| onHover              | Event when a city hovered on the map.                                       | ( **city** : *CityType* ) => *void*                                          | -                                                                      | 1.0.0 |
| onClick              | Event when a city clicked on the map                                        | ( **city** : *CityType* ) => *void*                                          | -                                                                      | 1.0.0 |
| selectionMode        | Enables single or multiple selection. `onClick` / `onHover` still fire.     | *SelectionMode*                                                              | *"none"*                                                               | 2.2.0 |
| selectedCity         | Controlled single selection id, or `null` to clear it.                      | *string \| null*                                                             | -                                                                      | 2.2.0 |
| defaultSelectedCity  | Initial uncontrolled single selection id.                                   | *string*                                                                     | -                                                                      | 2.2.0 |
| selectedCities       | Controlled multiple selection ids. An empty array clears the selection.     | *string*[]                                                                   | -                                                                      | 2.2.0 |
| defaultSelectedCities| Initial uncontrolled multiple selection ids.                                | *string*[]                                                                   | -                                                                      | 2.2.0 |
| maxSelection         | Caps the number of selected cities in multiple mode.                        | *number*                                                                     | -                                                                      | 2.2.0 |
| onSelect             | Fires with the full city when an activation selects it.                     | *OnSelectCallback*                                                           | -                                                                      | 2.2.0 |
| onSelectionChange    | Fires with the complete selection whenever it changes.                      | *OnSelectionChangeCallback*                                                  | -                                                                      | 2.2.0 |
| onMaxSelectionReached| Fires when an addition would exceed `maxSelection`.                         | *OnMaxSelectionReachedCallback*                                              | -                                                                      | 2.2.0 |

### Styling

Province colors and outlines resolve in this order, highest precedence first:

1. `getCityStyle` for the individual province
2. `customStyle`
3. CSS custom property (`--tm-*`) with its built-in fallback
4. built-in default

#### CSS custom properties

CSS custom properties can be set on an ancestor or directly on the map container through `style` or `containerProps.style`. They inherit, so two maps can use different themes without affecting each other.

| Variable              | Default                  | Applies to                                      |
| :-------------------- | :----------------------- | :---------------------------------------------- |
| `--tm-idle-color`     | `#444`                   | Idle province fill                              |
| `--tm-hover-color`    | `#dc3522`                | Hovered province fill                           |
| `--tm-selected-color` | `#dc3522`                | Selected province fill                          |
| `--tm-disabled-color` | `#e5e5e5`                | Disabled province fill                          |
| `--tm-stroke-color`   | `none`                   | Non-selected province outline (none by default) |
| `--tm-stroke-width`   | `0.5`                    | Non-selected province outline width             |
| `--tm-focus-ring`     | `#1a73e8`                | Keyboard focus outline color                    |

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

```javascript
<TurkeyMap className="checkout-map" />
```

For a per-instance theme, set the variables inline. TypeScript consumers can cast the style object because custom properties are not part of `React.CSSProperties`:

```javascript
<TurkeyMap
  style={{ maxWidth: 800, '--tm-idle-color': '#eef2f7' } as React.CSSProperties}
/>
```

`customStyle` values override CSS variables. If you pass `customStyle`, the values you supply (including the required `idleColor` and `hoverColor`) win over inherited `--tm-*` values.

#### `customStyle`

`customStyle` can set the per-map colors and a general province outline:

```javascript
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

#### `getCityStyle`

`getCityStyle` runs for every province and receives the city plus its current interaction state:

```javascript
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

<TurkeyMap getCityStyle={getCityStyle} />
```

`CityInteractionState` contains `{ hovered, selected, disabled, focused }`. Returned values take precedence over `customStyle`, and any property set to `undefined` falls back to the resolved `customStyle`/CSS-variable value. Returning `undefined` or an empty object leaves the resolved style unchanged. The callback is not memoized by the component, so memoize expensive logic yourself if needed.

#### Container, SVG, and ids

```javascript
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

| Element        | With `id="checkout-map"`    | With `id` omitted                            |
| :------------- | :-------------------------- | :------------------------------------------- |
| Container      | `checkout-map`              | `svg-turkiye-haritasi-container`             |
| SVG            | `checkout-map-svg`          | `svg-turkiye-haritasi`                       |
| Tooltip        | `checkout-map-tooltip`      | `svg-turkiye-haritasi-container-tooltip`     |
| Province group | `checkout-map-turkiye`      | `turkiye`                                    |

Empty or whitespace-only ids are treated as omitted. The built-in tooltip animation name is also derived from `id`, so two maps with distinct ids do not share a keyframe name.

Province ids remain unchanged and unscoped: `<g id="istanbul">` stays `#istanbul` regardless of the map `id`. This keeps existing province selectors, event extraction, and custom datasets working. When rendering multiple maps, scope province CSS to each instance and pass distinct `id` values when isolation is required:

```javascript
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

## Licensing

This project is released under a MIT License.

## Versioning

Versioning scheme defined as in the pattern of "_majorVersion.minorVersion.bugfixVersion_"

| Level           | Description                                                                                                                 |
| :-------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| *majorVersion*  | This indicates that the version introduces breaking changes those possibly not backward compatible features.                |
| *minorVersion*  | This indicates that the version introduces small changes those are backward compatible with fine fitting for existing uses. |
| *bugfixVersion* | This indicates that the version solves some problems those popped out in the current major or minor versions.               |

## Release Process

This project has an automated build and release pipeline. For details on creating releases and publishing to npm, see [RELEASE.md](./RELEASE.md).

Quick reference:
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
- Run `npm run release` to prepare a release (tests, build, changelog, version bump)
- Run `npm run publish:npm` to publish to npm
- See [RELEASE.md](./RELEASE.md) for complete documentation

## Contributing

To contribute to this project please just open a pull request with a comprehensive description.

When making commits, please follow the [Conventional Commits](https://www.conventionalcommits.org/) specification to enable automated changelog generation.

---

## Credits

This project has been derivated from **dnomak**'s [svg-turkiye-haritasi][dnomak-link] project.

[dnomak-link]:https://github.com/dnomak/svg-turkiye-haritasi
