# Interactive Turkey Map React Component

An out-of-the-box city map of Turkey.

## Installation

```
npm install turkey-map-react
```

or

```
yarn add turkey-map-react
```

## Usage

### Importing (ES6)

```
import TurkeyMap from 'turkey-map-react';
```

### Basic usage with defaults
```
<TurkeyMap />
```

### Handling events
On click example:
```
<TurkeyMap 
    onClick={ ({ plateNumber, cityName }) => console.log(plateNumber + " - " + cityName + " is just clicked!") } 
/>
```

On mouse over example:
```
<TurkeyMap 
    hoverable={true}
    onHover={ ({ plateNumber, cityName }) => console.log("Cursor is over on " + plateNumber + " - " + cityName + "!") } 
/>
```
### City component wrapping
```
<TurkeyMap
    cityWrapper={(cityComponent, cityData) => ( 
        <Tooltip title={cityData.name} key={cityData.id}> 
            {cityComponent} 
        </ Tooltip> 
    )}
/>
```
This is generally used for [Antd](https://ant.design/components/tooltip/) style *Tooltip*. 

"*child*" parameter is the city DOM.

### Custom Data
```
<TurkeyMap data={this.state.apiData}/>
```
If custom SVG paths and/or city metadata is needed to be rendered, it can be provided through *data* property.

*data* property has to be in type of following:
```
CityType[] 
```
in other words : 
```
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
```
<TurkeyMap customStyle={{ idleColor: "#444", hoverColor: "#dc3522" }} />
```

## Licensing
This project is released under a MIT License.

## Contributing
To contribute to this project please just open a pull request with a comprehensive description.

---
## Credits

This project has been derivated from **dnomak**'s [svg-turkiye-haritasi][dnomak-link] project. 

[dnomak-link]:https://github.com/dnomak/svg-turkiye-haritasi