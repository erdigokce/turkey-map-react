import React, { Component } from 'react';
import Tooltip from './Tooltip';
import { data } from './data';

interface IProps {
  viewBox: ViewBoxType,
  visible: boolean,
  hoverable: boolean,
  customStyle: CustomStyleType,
  data: typeof data,
  cityWrapper?: (cityComponent: JSX.Element, city: CityType) => JSX.Element,
  onHover?: (city: CityType) => void,
  onClick?: (city: CityType) => void
}

interface IState {
  hoveredCity?: CityType;
}

export type CityType = { id: string; plateNumber: number; name: string; path: string };
export type CustomStyleType = { idleColor: string, hoverColor: string };
export type ViewBoxType = { top: number; left: number; width: number; height: number };
type GetCitiesReturn = { element: JSX.Element, cityType: CityType };

export default class TurkeyMap extends Component<IProps, IState> {
  private tooltipRef = React.createRef<HTMLDivElement>();

  constructor(props: IProps) {
    super(props);
    this.state = {
      hoveredCity: undefined,
    };
  }

  static defaultProps: IProps = {
    viewBox: { top: 0, left: 80, width: 1050, height: 585 },
    visible: true,
    hoverable: true,
    data: data,
    customStyle: { idleColor: "#444", hoverColor: "#dc3522" },
  }

  cityWrapper = () => {
    return this.getCities().map(param => this.props.cityWrapper ? this.props.cityWrapper(param.element, param.cityType) : param.element);
  }

  onHover = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    const { onHover } = this.props;
    const onDefaultHover = (city: CityType) => this.setState({ hoveredCity: city });
    this.handleMouseEvent(event, onHover || onDefaultHover);
  }

  onClick = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    const { onClick } = this.props;
    if (onClick)
      this.handleMouseEvent(event, onClick);
  }

  onMouseEnter = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    (event.target as SVGGElement).style.fill = this.props.customStyle.hoverColor;
  }

  onMouseLeave = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    (event.target as SVGGElement).style.fill = this.props.customStyle.idleColor;
  }

  handleMouseEvent = (event: React.MouseEvent<SVGGElement, MouseEvent>, callback: (city: CityType) => void) => {
    var element = event.target as SVGGElement;

    if (element.tagName === 'path') {
      const parent = element.parentNode as Element;

      const cityId = parent.getAttribute('id') + "";
      const cityPath = element.getAttribute("d") + "";
      const cityPlateNumberText = parent.getAttribute('data-plakakodu') + "";
      const cityPlateNumber: number = parseInt(cityPlateNumberText !== "" ? cityPlateNumberText : "0");
      const cityName: string = parent.getAttribute('data-iladi') + "";
      const city: CityType = { id: cityId, name: cityName, plateNumber: cityPlateNumber, path: cityPath };

      if (callback && typeof callback === 'function') {
        callback(city);
        return;
      }
    }
  }

  getCities = (): GetCitiesReturn[] => {
    const { data: cityData, hoverable, customStyle } = this.props
    return cityData.map(city => {
      let element = (<g id={city.id}
        data-plakakodu={city.plateNumber}
        data-iladi={city.name}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onMouseOver={event => hoverable ? this.onHover(event) : undefined}
        onClick={this.onClick}
      >
        <path style={{ cursor: "pointer", fill: customStyle.idleColor }} d={city.path} />
      </g >);
      let cityType: CityType = { id: city.id, name: city.name, path: city.path, plateNumber: city.plateNumber }
      return { element, cityType }
    });
  }

  render() {
    const { hoveredCity } = this.state;
    const { viewBox, visible } = this.props;
    const { top, left, width, height } = viewBox;
    return <div id="svg-turkiye-haritasi-container" style={{ maxWidth: 1140, margin: "0 auto", textAlign: 'center' }} hidden={!visible}>
      <Tooltip ref={this.tooltipRef} id={hoveredCity?.id} text={hoveredCity?.name} />
      <svg
        version="1.1"
        id="svg-turkiye-haritasi"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox={`${top} ${left} ${width} ${height}`}
        xmlSpace="preserve"
        style={{ width: "100%", height: "auto" }}
      >
        <g key="turkiye" id="turkiye">
          {this.cityWrapper()}
        </g>
      </svg>
    </div>
  }

}
