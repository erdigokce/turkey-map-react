import React, { Component, MouseEventHandler } from 'react';
import Tooltip from './Tooltip';
import styles from './Tooltip.css';
import { Property } from 'csstype';
import { cities } from './data';

type Data = {
  cities: CityType[],
}

interface IProps {
  viewBox: ViewBoxType,
  visible: boolean,
  hoverable: boolean,
  customStyle: CustomStyleType,
  showTooltip: boolean,
  tooltipText?: string,
  data: Data,
  cityWrapper?: (cityComponent: JSX.Element, city: CityType) => JSX.Element,
  onHover?: (city: CityType) => void,
  onClick?: (city: CityType) => void
}

interface IState {
  hoveredCity?: CityType;
  tooltipStyle: { left: number, top: number, visibility?: Property.Visibility, animation?: Property.Animation }
}

export type CityType = { id: string; plateNumber: number; name: string; path: string };
export type CustomStyleType = { idleColor: string, hoverColor: string };
export type ViewBoxType = { top: number; left: number; width: number; height: number };
type GetCitiesReturn = { element: JSX.Element, cityType: CityType };

export default class TurkeyMap extends Component<IProps, IState> {

  constructor(props: IProps) {
    super(props);
    this.state = {
      hoveredCity: undefined,
      tooltipStyle: { left: 0, top: 0, visibility: "hidden" }
    };
  }

  static defaultProps: IProps = {
    viewBox: { top: 0, left: 80, width: 1050, height: 585 },
    visible: true,
    hoverable: true,
    showTooltip: false,
    data: { cities },
    customStyle: { idleColor: "#444", hoverColor: "#dc3522" },
  }

  cityWrapper = () => {
    return this.getCities().map(param => this.props.cityWrapper ? this.props.cityWrapper(param.element, param.cityType) : param.element);
  }

  onHover = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    const { onHover } = this.props;
    const handleDefaultHover = (city: CityType) => { this.setState({ hoveredCity: city }) };
    this.handleMouseEvent(event, onHover || handleDefaultHover);
  }

  onClick = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    const { onClick } = this.props;
    if (onClick)
      this.handleMouseEvent(event, onClick);
  }

  onMouseMove: MouseEventHandler = (event) => {
    this.setState(prevState => ({
      tooltipStyle: {
        ...prevState.tooltipStyle,
        left: event.pageX + 16,
        top: event.pageY - 32
      }
    }));
  }

  onMouseEnter = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    const { customStyle, showTooltip } = this.props;
    (event.target as SVGGElement).style.fill = customStyle.hoverColor;
    if (!showTooltip)
      return;
    this.setState(prevState => ({
      tooltipStyle: {
        ...prevState.tooltipStyle,
        animation: undefined,
        visibility: "visible"
      }
    }));
  }

  onMouseLeave = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    const { customStyle, showTooltip } = this.props;
    (event.target as SVGGElement).style.fill = customStyle.idleColor;
    if (!showTooltip)
      return;
    this.setState(prevState => ({
      tooltipStyle: {
        ...prevState.tooltipStyle,
        visibility: undefined,
        animation: `0.1s ${styles.fadeOut} forwards ease-out`,
      }
    }));
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
    const { data, hoverable, showTooltip, customStyle } = this.props
    const { cities: cityData } = data;
    return cityData.map((city: CityType) => {
      let element = (<g id={city.id}
        data-plakakodu={city.plateNumber}
        data-iladi={city.name}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onMouseOver={event => hoverable ? this.onHover(event) : undefined}
        onMouseMove={showTooltip ? this.onMouseMove : undefined}
        onClick={this.onClick}
      >
        <path style={{ cursor: "pointer", fill: customStyle.idleColor }} d={city.path} />
      </g >);
      let cityType: CityType = { id: city.id, name: city.name, path: city.path, plateNumber: city.plateNumber }
      return { element, cityType }
    });
  }

  render() {
    const { hoveredCity, tooltipStyle } = this.state;
    const { viewBox, visible, showTooltip, tooltipText } = this.props;
    const { top, left, width, height } = viewBox;
    return <div id="svg-turkiye-haritasi-container" style={{ maxWidth: 1140, margin: "0 auto", textAlign: 'center' }} hidden={!visible}>
      {showTooltip && <Tooltip text={tooltipText || hoveredCity?.name} style={tooltipStyle} />}
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
