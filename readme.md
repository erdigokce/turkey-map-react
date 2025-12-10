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

## API

### Types

| Type              | Description                                                                             |
| :---------------- | :-------------------------------------------------------------------------------------- |
| *CityType*        | { **id**: *string*, **plateNumber**: *number*, **name**: *string*, **path**: *string* } |
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

## Contributing

To contribute to this project please just open a pull request with a comprehensive description.

---

## Credits

This project has been derivated from **dnomak**'s [svg-turkiye-haritasi][dnomak-link] project.

[dnomak-link]:https://github.com/dnomak/svg-turkiye-haritasi
