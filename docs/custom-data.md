# Custom data and cities

Provide your own SVG paths and metadata, disable individual provinces, and wrap the rendered city elements.

[Back to README](../readme.md) · [Getting started](./getting-started.md) · [API reference](./api.md)

## Custom data

```jsx
<TurkeyMap data={{ cities: this.state.apiData }} />
```

If custom SVG paths and/or city metadata need to be rendered, they can be provided through the `data` prop. For full control over the rendered elements, [`useTurkeyMap`](./headless.md#custom-city-metadata) accepts a generic city subtype so metadata survives selection state, getters, and callbacks.

The `data` prop has the following type:

```ts
{ cities: CityType[] }
```

where each city is:

```ts
{ id: string, plateNumber: number, name: string, path: string, disabled?: boolean }
```

The root entry falls back to the built-in dataset when `data` is omitted. The `turkey-map-react/core` entry does not: it requires `data` in TypeScript, and plain JavaScript that omits it renders no provinces.

## Disabled provinces

Provinces can be disabled through three additive sources: a list of ids, a predicate, or a per-city flag in custom data.

```jsx
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

<TurkeyMap data={{ cities: citiesWithDisabled }} />
```

A city is disabled when any source marks it disabled. Unknown ids in `disabledCities` are ignored, and offering the same id more than once has no additional effect.

Disabled provinces stay rendered and discoverable, but ignore pointer and keyboard activation: `onHover`, `onClick`, `onSelect`, `onSelectionChange`, and `onMaxSelectionReached` do not fire. They use `disabledColor` (default `#e5e5e5`), `cursor: not-allowed`, and `aria-disabled="true"`. Disabled styling wins over hover and selected styling.

```jsx
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

## City wrapping

```jsx
const renderCity = (cityComponent, cityData) => (
  <Tooltip title={cityData.name} key={cityData.id}>
    {cityComponent}
  </Tooltip>
);

<TurkeyMap cityWrapper={renderCity} />;
```

This is generally used for [Antd](https://ant.design/components/tooltip/) style *Tooltip*. The `cityComponent` argument is the rendered province DOM.

## Related

- [Styling and DOM ids](./styling.md) — colors for idle, hovered, selected, and disabled provinces.
- [Accessibility](./accessibility.md) — how disabled provinces participate in keyboard navigation.
- [API reference: data and interaction props](./api.md#data-and-interaction) — `data`, `disabledCities`, `isCityDisabled`, and `cityWrapper`.
