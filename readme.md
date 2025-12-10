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

This package declares React as a peer dependency and does not bundle React into the published build. The host application must provide React (version >=16.8). The package is built to be compatible with React 16/17/18 — your application’s React installation will be used at runtime, avoiding duplicate React instances and version conflicts.

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

### County Map Feature

When enabled, clicking on a city displays a popup showing the county (ilçe) map of that city. This feature:
- Must be explicitly enabled via `showCountyMapOnClick` prop
- Requires county data to be imported separately to keep bundle size small when not used
- Can be customized via `countyMapWrapper` prop
- Supports all the same interaction handlers as the main map

#### Basic Usage

```javascript
import TurkeyMap from 'turkey-map-react';
import { istanbulCounties, ankaraCounties } from 'turkey-map-react/lib/data/counties';

// Import only the county data you need
const countyData = {
  istanbul: istanbulCounties,
  ankara: ankaraCounties
};

<TurkeyMap 
  showCountyMapOnClick={true}
  countyData={countyData}
/>
```

#### Handling County Events

```javascript
<TurkeyMap 
  showCountyMapOnClick={true}
  countyData={countyData}
  onCountyClick={(county, city) => {
    console.log(`${county.name} in ${city.name} was clicked!`);
  }}
/>
```

#### Custom County Map Wrapper

```javascript
const customCountyMapWrapper = (countyMapPopup, city, countyData) => (
  <div className="my-custom-wrapper">
    <h3>Custom Header for {city.name}</h3>
    {countyMapPopup}
  </div>
);

<TurkeyMap 
  showCountyMapOnClick={true}
  countyData={countyData}
  countyMapWrapper={customCountyMapWrapper}
/>
```

#### Providing Custom County Data

County data must follow the `CountyData` type structure:

```javascript
import { CountyData } from 'turkey-map-react';

const myCustomCountyData: CountyData = {
  cityId: "mycity",
  cityName: "My City",
  counties: [
    { id: "county1", name: "County 1", path: "M 0 0 L 100 0..." },
    { id: "county2", name: "County 2", path: "M 100 0 L 200 0..." }
  ]
};

<TurkeyMap 
  showCountyMapOnClick={true}
  countyData={{ mycity: myCustomCountyData }}
/>
```

**Note on Sample Data:** The built-in county data for Istanbul, Ankara, and Izmir uses placeholder rectangular paths for demonstration purposes only. These are NOT actual geographic boundaries. For production use, you should provide real geographic SVG data for county boundaries. Consider using geographic data sources like GADM or OpenStreetMap for accurate county shapes.

## API

### Types

| Type              | Description                                                                             |
| :---------------- | :-------------------------------------------------------------------------------------- |
| *CityType*        | { **id**: *string*, **plateNumber**: *number*, **name**: *string*, **path**: *string* } |
| *CountyType*      | { **id**: *string*, **name**: *string*, **path**: *string* }                            |
| *CountyData*      | { **cityId**: *string*, **cityName**: *string*, **counties**: *CountyType*[] }          |
| *ViewBoxType*     | { **top**: *number*, **left**: *number*, **width**: *number*, **height**: *number* }    |
| *CustomStyleType* | { **idleColor**: *string*, **hoverColor**: *string* }                                   |

### props

| Property    | Description                                                | Type                                                                         | Default                                                                | Since |
| :---------- | :--------------------------------------------------------- | :--------------------------------------------------------------------------- | :--------------------------------------------------------------------- | ----: |
| viewBox     | Position and dimension information of the map (svg) layout | *ViewBoxType*                                                                | { **top**: *0*, **left**: *80*, **width**: *1050*, **height**: *585* } | 1.0.0 |
| visible     | Defines the visibility of the component                    | *boolean*                                                                    | *true*                                                                 | 1.0.0 |
| hoverable   | Enables *onHover* event availability                       | *boolean*                                                                    | *true*                                                                 | 1.0.0 |
| showTooltip | Displays default tooltip if set to true                    | *boolean*                                                                    | *false*                                                                | 1.1.0 |
| tooltipText | Sets custom text to default tooltip                        | *string*                                                                     | *City Name*                                                                  | 1.1.0 |
| customStyle | Stylizing the component.                                   | *CustomStyleType*[]                                                          | { **idleColor**: *#444*, **hoverColor**: *#dc3522* }                   | 1.0.0 |
| data        | Allows for providing custom SVG paths and metadata.        | *CityType*[]                                                                 | *Built-in data*                                                        | 1.0.0 |
| cityWrapper | City DOMs are wrapped by provided component.               | ( **cityComponent**: *JSX.Element*, **city** : *CityType* ) => *JSX.Element* | *Unwrapped city*                                                       | 1.0.0 |
| onHover     | Event when a city hovered on the map.                      | ( **city** : *CityType* ) => *void*                                          | -                                                                      | 1.0.0 |
| onClick     | Event when a city clicked on the map                       | ( **city** : *CityType* ) => *void*                                          | -                                                                      | 1.0.0 |
| showCountyMapOnClick | Enables county map popup when a city is clicked       | *boolean*                                                                    | *false*                                                                | 3.0.0 |
| countyData  | County data for cities (import only what you need)         | *Record<string, CountyData>*                                                 | *undefined*                                                            | 3.0.0 |
| countyMapWrapper | Custom wrapper for county map popup                    | ( **popup**: *JSX.Element*, **city**: *CityType*, **data**: *CountyData* ) => *JSX.Element* | *Default popup*                                                        | 3.0.0 |
| onCountyClick | Event when a county is clicked in the county map         | ( **county**: *CountyType*, **city**: *CityType* ) => *void*                 | -                                                                      | 3.0.0 |

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
