# Headless hook

Use `useTurkeyMap` when you want the map's selection, keyboard, focus, announcement, disabled-state, and tooltip behavior without its SVG markup. The hook renders nothing and requires `data`; you own the elements, styling, tooltip content, and portals.

[Back to README](../readme.md) · [Getting started](./getting-started.md) · [Selection and forms](./selection.md) · [API reference](./api.md)

## Importing

`useTurkeyMap` is exported from both entry points:

```jsx
import { useTurkeyMap } from 'turkey-map-react';
import { useTurkeyMap } from 'turkey-map-react/core';
```

Use `turkey-map-react/core` when you already have your own city data and want to keep the built-in 81-province dataset out of the bundle. The hook itself never imports the dataset, and `data` is required even on the root entry.

Bundlers and TypeScript use the named import shown above. Node's native ESM loader treats the published CommonJS bundle as a default export, so use `import pkg from 'turkey-map-react'; const { useTurkeyMap } = pkg;` there.

## Custom SVG

```jsx
import { useTurkeyMap } from 'turkey-map-react';
import { cities } from 'turkey-map-react/data';

export function HeadlessMap() {
  const {
    getContainerProps,
    getCityProps,
    getTooltipProps,
    selectedCities,
    tooltipCity,
    announcement,
  } = useTurkeyMap({
    data: { cities },
    selectionMode: 'multiple',
    showTooltip: true,
    onSelectionChange: (selected) => {
      console.log(selected.map((city) => city.id));
    },
  });

  return (
    <div>
      <svg {...getContainerProps()}>
        {cities.map((city) => {
          const selected = selectedCities.some((item) => item.id === city.id);
          return (
            <path
              key={city.id}
              d={city.path}
              {...getCityProps(city)}
              style={{
                fill: selected ? '#dc3522' : '#444',
                cursor: 'pointer',
              }}
            />
          );
        })}
      </svg>

      {tooltipCity && (
        <div {...getTooltipProps()}>
          {tooltipCity.name}
        </div>
      )}

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
      >
        {announcement}
      </div>
    </div>
  );
}
```

`getContainerProps()` belongs on the element that contains every city. `getCityProps(city)` belongs on the interactive element for one city. The hook applies the city id marker used by keyboard navigation; keep the props intact.

## Non-SVG renderers

The getters work on HTML elements too. Replace the SVG with a list, grid, or any custom markup:

```jsx
const { getContainerProps, getCityProps, selectedIds, announcement } = useTurkeyMap({
  data,
  selectionMode: 'single',
});

return (
  <div>
    <div {...getContainerProps()} className="province-list">
      {data.cities.map((city) => (
        <div key={city.id} {...getCityProps(city)} className="province-row">
          {city.name}
        </div>
      ))}
    </div>
    <p>{selectedIds.length} selected</p>
    <div role="status" aria-live="polite" aria-atomic="true" style={visuallyHidden}>
      {announcement}
    </div>
  </div>
);
```

Do not add your own `onClick`, `onKeyDown`, `tabIndex`, `role`, or ARIA state handlers to the same element; `getCityProps` owns them. For decorative children inside a city row, use elements that do not handle their own clicks or focus.

## Custom city metadata

The hook is generic over a subtype of `CityType`. Extra metadata flows through `data`, `selectedCities`, `getCityProps`, and every city callback:

```tsx
import type { CityType, Data } from 'turkey-map-react';
import { useTurkeyMap } from 'turkey-map-react/core';

type RegionCity = CityType & { region: string };

const data: Data<RegionCity> = {
  cities: [
    { id: 'istanbul', plateNumber: 34, name: 'İstanbul', path: '...', region: 'Marmara' },
  ],
};

export function RegionMap() {
  const { getContainerProps, getCityProps, selectedCities } = useTurkeyMap<RegionCity>({
    data,
    selectionMode: 'multiple',
    onSelectionChange: (cities) => {
      // cities is RegionCity[]
      console.log(cities.map((city) => city.region));
    },
  });

  return (
    <div {...getContainerProps()}>
      {data.cities.map((city) => (
        <div key={city.id} {...getCityProps(city)}>
          {city.name} — {city.region}
        </div>
      ))}
      <span>{selectedCities.map((city) => city.region).join(', ')}</span>
    </div>
  );
}
```

Omitting the type parameter defaults to `CityType`, so existing code type-checks unchanged.

## Selection

The hook uses the same modes, controlled/uncontrolled values, limits, and callbacks as `TurkeyMap`:

```tsx
const {
  selectedCities,
  selectedIds,
  activateCity,
  changeSelection,
  clearSelection,
  getCityProps,
} = useTurkeyMap({
  data,
  selectionMode: 'multiple',
  selectedCities: controlledIds, // omit for uncontrolled
  maxSelection: 3,
  onSelectionChange: (cities) => setControlledIds(cities.map((city) => city.id)),
});
```

- `activateCity(city)` applies a pointer-equivalent activation.
- `changeSelection(ids)` applies a native-select-style value, including normalization, the `maxSelection` cap, callbacks, and announcements.
- `clearSelection()` clears without firing `onSelect`.

Selection values are city ids. `selectedCities` contains the full city objects from `data`, in first-occurrence order. Unknown ids do not throw; they are omitted from `CityType[]` callbacks.

## Tooltips

Tooltip support is opt-in with `showTooltip`. The hook owns visibility, hover intent, timers, anchoring, and reduced-motion behavior; you render the content and decide whether to portal it:

```tsx
const {
  tooltipCity,
  tooltipVisible,
  getTooltipProps,
} = useTurkeyMap({
  data,
  showTooltip: true,
  tooltipPosition: 'city', // or "cursor"
  tooltipOffset: 16,
  tooltipDelay: 80,
});

return tooltipCity ? (
  <div {...getTooltipProps()}>
    <strong>{tooltipCity.name}</strong>
  </div>
) : null;
```

`getTooltipProps()` includes `role="tooltip"`, `aria-hidden` while hidden, inline positioning, and `pointer-events: none`. The hook does not render keyframes, content, or a portal. If you want the component's fade-out, pass `tooltipAnimationName` and render a matching `@keyframes` rule; otherwise the hook hides immediately with `visibility: hidden`.

## Live region and focus

The map is a single roving tab stop. `getCityProps` supplies the correct `tabIndex`, role, accessible name, selected state, and disabled state, and moves DOM focus with the arrow keys, Home, and End. Render the `announcement` string in a visually hidden polite live region so focus and selection changes are spoken:

```jsx
<div role="status" aria-live="polite" aria-atomic="true" style={visuallyHidden}>
  {announcement}
</div>
```

Add a visible focus style in your own CSS:

```css
[role='option']:focus-visible,
[role='button']:focus-visible {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;
}
```

## Native select fallback

Recreate the component's `a11yFallback` with `changeSelection`:

```tsx
const { selectedIds, isCityDisabled, changeSelection } = useTurkeyMap({
  data,
  selectionMode: 'multiple',
});

<select
  aria-label="Provinces"
  multiple
  value={selectedIds}
  onChange={(event) => {
    changeSelection(Array.from(event.currentTarget.selectedOptions, (option) => option.value));
  }}
  style={visuallyHidden}
>
  {data.cities.map((city) => (
    <option key={city.id} value={city.id} disabled={isCityDisabled(city)}>
      {city.name}
    </option>
  ))}
</select>;
```

## Memoization

The getters return stable event handler references, so memoized city rows do not re-render merely because selection, focus, or tooltip state changed elsewhere. Memoize the row component and keep `data` identities stable:

```tsx
const CityRow = React.memo(function CityRow({ city, getCityProps }) {
  return <div {...getCityProps(city)}>{city.name}</div>;
});
```

`getCityProps(city)` itself returns a fresh object because its ARIA and tab state change, but spreading it passes the same handler functions for the same city.

## Server rendering

The hook does not access `document` or `window` during render, so it can be called while rendering to a string. Tooltips and other interactive state start hidden and become active only after the consumer's elements are mounted. If you portal a tooltip, guard the portal with a mounted flag as usual.

## Advanced composition

`cityHandlers` exposes the same stable imperative handlers used by the getters when you need to compose them with local interaction state (for example, a component that keeps its own hover styling). `registerCityHoverClear` lets a custom city shell clear local hover state when another city becomes active. Most headless consumers do not need either field.

## What the hook does not do

- It does not render or style the map; use `selectedCities`, `selectedIds`, ARIA state, or your own data attributes.
- It does not render tooltip content or a portal; render `tooltipCity` yourself.
- It does not apply `customStyle`, `getCityStyle`, `cityWrapper`, or the component's legacy DOM ids.
- It does not render the native select fallback; use `changeSelection` and `isCityDisabled`.
- It does not add a new package subpath. Import it from the root or `core` entry.

## Related

- [Selection and forms](./selection.md) — the full selection contract.
- [Tooltips](./tooltips.md) — tooltip behavior shared with the component.
- [Accessibility](./accessibility.md) — keyboard, ARIA, live regions, and the select fallback.
- [API reference: headless hook](./api.md#headless-hook) — every option, result field, and type.
