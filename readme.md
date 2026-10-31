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
<TurkeyMap data={this.state.apiData}/>
```

If custom SVG paths and/or city metadata is needed to be rendered, it can be provided through *data* property.

*data* property has to be in type of following:

```javascript
CityType[] 
```

in other words :

```javascript
{ id: string, plateNumber: number, name: string, path: string }[]
```

## API

### Types

| Type                             | Description                                                                                                                  |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| *CityType*                       | { **id**: *string*, **plateNumber**: *number*, **name**: *string*, **path**: *string* }                                      |
| *ViewBoxType*                    | { **top**: *number*, **left**: *number*, **width**: *number*, **height**: *number* }                                         |
| *CustomStyleType*                | { **idleColor**: *string*, **hoverColor**: *string*, **selectedColor**?: *string*, **selectedStroke**?: *string*, **selectedStrokeWidth**?: *number* } |
| *SelectionMode*                  | `"none" \| "single" \| "multiple"`                                                                                           |
| *SelectionValue*                 | `string \| string[] \| null`                                                                                                 |
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
| customStyle          | Stylizing the component.                                                    | *CustomStyleType*[]                                                          | { **idleColor**: *#444*, **hoverColor**: *#dc3522* }                   | 1.0.0 |
| data                 | Allows for providing custom SVG paths and metadata.                         | *CityType*[]                                                                 | *Built-in data*                                                        | 1.0.0 |
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

Colors of the city can be overwritten with setting *customStyle* property.

Example:

```javascript
<TurkeyMap customStyle={{ idleColor: "#444", hoverColor: "#dc3522" }} />
```

Default tooltip can be styled through predefined html IDs.

`#svg-turkiye-haritasi-container-tooltip` is the ID for tooltip DOM. While `#svg-turkiye-haritasi-container` is the ID for container (parent) DOM.

Example:

```css
#svg-turkiye-haritasi-container > #svg-turkiye-haritasi-container-tooltip {
  background-color: rgba(54, 0, 99, 0.479);
}
```

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
