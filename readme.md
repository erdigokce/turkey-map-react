# Interactive Turkey Map React Component

An out-of-the-box city map of Turkey.

## Installation

```javascript
npm install turkey-map-react
```

or

```javascript
yarn add turkey-map-react
```

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
