# Selection and forms

Single and multiple selection, controlled and uncontrolled values, selection limits, and form integration.

[Back to README](../readme.md) · [Getting started](./getting-started.md) · [API reference](./api.md)

## Selection

Selection is opt-in through `selectionMode` (`"none"` by default). Both controlled and uncontrolled forms are available.

| Selection | Uncontrolled                | Controlled        |
| :-------- | :-------------------------- | :---------------- |
| Single    | `defaultSelectedCity`       | `selectedCity`    |
| Multiple  | `defaultSelectedCities`     | `selectedCities`  |

Single selection, uncontrolled:

```jsx
<TurkeyMap
  selectionMode="single"
  defaultSelectedCity="istanbul"
  onSelectionChange={(cities) => console.log(cities.map((city) => city.id))}
/>
```

Single selection, controlled (`null` clears the selection):

```jsx
const [cityId, setCityId] = useState(null);

<TurkeyMap
  selectionMode="single"
  selectedCity={cityId}
  onSelectionChange={([city]) => setCityId(city ? city.id : null)}
/>
```

Multiple selection, controlled, with a limit:

```jsx
const [cityIds, setCityIds] = useState(['ankara', 'istanbul']);

<TurkeyMap
  selectionMode="multiple"
  selectedCities={cityIds}
  maxSelection={3}
  onSelectionChange={(cities) => setCityIds(cities.map((city) => city.id))}
  onMaxSelectionReached={(city, selectedCities, maxSelection) => {
    console.log(
      `${city.name} was not added; ${selectedCities.length}/${maxSelection} selected`,
    );
  }}
/>
```

Use `defaultSelectedCities` for uncontrolled multiple selection. `selectedCity`, `selectedCities`, `defaultSelectedCity`, and `defaultSelectedCities` are primitive id values, so they can be bound directly to a form field. `onSelect` receives the full `CityType` for the city that was just selected; `onSelectionChange` always receives the complete selection as an array (zero or one item in single mode).

Selected cities use `selectedColor`, `selectedStroke`, and `selectedStrokeWidth` from `customStyle`:

```jsx
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

## Form integration

The selection value is a plain id (or `null`) for single mode and an id array for multiple mode:

```jsx
// react-hook-form
const { field } = useController({ name: 'province' });

<TurkeyMap
  selectionMode="single"
  selectedCity={field.value ?? null}
  onSelectionChange={([city]) => field.onChange(city ? city.id : null)}
/>
```

```jsx
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

## Related

- [Disabled provinces](./custom-data.md#disabled-provinces) — disabled cities stay in selection values but cannot be activated.
- [API reference: selection props](./api.md#selection-props) — full prop and callback signatures.
