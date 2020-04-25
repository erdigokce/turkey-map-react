import React = require('react');
import { Component } from 'react';
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

export type CityType = { id: string; plateNumber: number; name: string; path: string };
export type CustomStyleType = { idleColor: string, hoverColor: string };
export type ViewBoxType = { top: number; left: number; width: number; height: number };

export default class TurkeyMap extends Component<IProps, { hovered: boolean }> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            hovered: false
        }
    }

    static defaultProps: IProps = {
        viewBox: { top: 0, left: 80, width: 1050, height: 585 },
        visible: true,
        hoverable: true,
        data: data,
        customStyle: { idleColor: "#444", hoverColor: "#dc3522" }
    }

    cityWrapper = () => {
        return this.getCities().map(param => this.props.cityWrapper ? this.props.cityWrapper(param.element, param.cityType) : param);
    }

    onHover = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
        if (this.props.onHover)
            this.handleMouseEvent(event, this.props.onHover);
    }

    onClick = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
        if (this.props.onClick)
            this.handleMouseEvent(event, this.props.onClick);
    }

    onMouseEnter = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
        (event.target as SVGGElement).style.fill = this.props.customStyle.hoverColor;
    }

    onMouseLeave = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
        (event.target as SVGGElement).style.fill = this.props.customStyle.idleColor;
    }

    handleMouseEvent = (event: React.MouseEvent<SVGGElement, MouseEvent>, callback: (city: {
        name: string;
        plateNumber: number;
    }) => void) => {
        var element = event.target as SVGGElement;
        if (element.tagName === 'path') {
            const parent = element.parentNode as Element;
            const cityId = parent.getAttribute('id') + "";
            const cityPath = element.getAttribute("d") + "";
            const cityPlateNumberText = parent.getAttribute('data-plakakodu') + "";
            const cityPlateNumber: number = parseInt(cityPlateNumberText !== "" ? cityPlateNumberText : "0");
            const cityName: string = parent.getAttribute('data-iladi') + "";
            let city: CityType = { id: cityId, name: cityName, plateNumber: cityPlateNumber, path: cityPath };
            callback(city);
        }
    }

    getCities = (): { element: JSX.Element, cityType: CityType }[] => {
        return this.props.data.map(city => {
            let element = (<g id={city.id}
                data-plakakodu={city.plateNumber}
                data-iladi={city.name}
                onMouseEnter={this.onMouseEnter}
                onMouseLeave={this.onMouseLeave}
                onMouseOver={event => this.props.hoverable ? this.onHover(event) : undefined}
                onClick={this.onClick}
            >
                <path style={{ cursor: "pointer" }} d={city.path} />
            </g >);
            let cityType: CityType = { id: city.id, name: city.name, path: city.path, plateNumber: city.plateNumber }
            return { element, cityType }
        });
    }

    render() {
        return <div id="svg-turkiye-haritasi-container" style={{ maxWidth: 1140, margin: "0 auto", textAlign: 'center' }} hidden={!this.props.visible}>
            <svg
                version="1.1"
                id="svg-turkiye-haritasi"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                viewBox={this.props.viewBox.top + " " + this.props.viewBox.left + " " + this.props.viewBox.width + " " + this.props.viewBox.height}
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
