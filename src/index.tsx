import React, { useState, useCallback, MouseEventHandler } from 'react';
import Tooltip from './Tooltip';
import CountyMapPopup, { CountyData, CountyType } from './CountyMapPopup';
import { Property } from 'csstype';
import { cities } from './data';

type Data = {
  cities: CityType[],
}

interface IProps {
  viewBox?: ViewBoxType,
  visible?: boolean,
  hoverable?: boolean,
  customStyle?: CustomStyleType,
  showTooltip?: boolean,
  tooltipText?: string,
  data?: Data,
  cityWrapper?: (cityComponent: React.ReactElement, city: CityType) => React.ReactElement,
  onHover?: (city: CityType) => void,
  onClick?: (city: CityType) => void,
  showCountyMapOnClick?: boolean,
  countyData?: Record<string, CountyData>,
  countyMapWrapper?: (countyMapPopup: React.ReactElement, city: CityType, countyData: CountyData) => React.ReactElement,
  onCountyClick?: (county: CountyType, city: CityType) => void
}

export type CityType = { id: string; plateNumber: number; name: string; path: string };
export type CustomStyleType = { idleColor: string, hoverColor: string };
export type ViewBoxType = { top: number; left: number; width: number; height: number };
type GetCitiesReturn = { element: React.ReactElement, cityType: CityType };

// Re-export CountyData and CountyType for convenience
export type { CountyData, CountyType } from './CountyMapPopup';

const TurkeyMap: React.FC<IProps> = ({
  viewBox = { top: 0, left: 80, width: 1050, height: 585 },
  visible = true,
  hoverable = true,
  showTooltip = false,
  data = { cities },
  customStyle = { idleColor: "#444", hoverColor: "#dc3522" },
  tooltipText,
  cityWrapper,
  onHover,
  onClick,
  showCountyMapOnClick = false,
  countyData,
  countyMapWrapper,
  onCountyClick
}) => {
  const [hoveredCityName, setHoveredCityName] = useState<string | undefined>(undefined);
  const [selectedCountyData, setSelectedCountyData] = useState<{ city: CityType, countyData: CountyData } | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<{ 
    left: number, 
    top: number, 
    visibility?: Property.Visibility, 
    animation?: Property.Animation 
  }>({ left: 0, top: 0, visibility: "hidden" });

  const handleMouseEvent = useCallback((
    event: React.MouseEvent<SVGGElement, MouseEvent>, 
    callback: (city: CityType) => void
  ) => {
    const element = event.target as Element;

    if (element.tagName === 'path') {
      const parent = element.parentNode as Element;

      const cityId = parent.getAttribute('id') ?? "";
      const cityPath = element.getAttribute("d") ?? "";
      const cityPlateNumberText = parent.getAttribute('data-plakakodu') ?? "";
      const cityPlateNumber: number = parseInt(cityPlateNumberText !== "" ? cityPlateNumberText : "0");
      const cityName: string = parent.getAttribute('data-iladi') ?? "";
      const city: CityType = { id: cityId, name: cityName, plateNumber: cityPlateNumber, path: cityPath };

      if (callback && typeof callback === 'function') {
        callback(city);
      }
    }
  }, []);

  const handleHover = useCallback((city: CityType) => {
    setHoveredCityName(city.name);
    if (onHover) {
      onHover(city);
    }
  }, [onHover]);

  const handleOnHover = useCallback((event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    handleMouseEvent(event, handleHover);
  }, [handleMouseEvent, handleHover]);

  const handleOnClick = useCallback((event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    const handleCityClick = (city: CityType) => {
      // Call the original onClick handler if provided
      if (onClick) {
        onClick(city);
      }

      // Show county map if enabled and county data is available
      if (showCountyMapOnClick && countyData && countyData[city.id]) {
        setSelectedCountyData({ city, countyData: countyData[city.id] });
      }
    };

    handleMouseEvent(event, handleCityClick);
  }, [onClick, handleMouseEvent, showCountyMapOnClick, countyData]);

  const handleOnMouseMove: MouseEventHandler = useCallback((event) => {
    setTooltipStyle(prevState => ({
      ...prevState,
      left: event.pageX + 16,
      top: event.pageY - 32
    }));
  }, []);

  const handleOnMouseEnter = useCallback((event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    const target = event.currentTarget;
    const path = target.querySelector('path');
    if (path) {
      path.style.fill = customStyle.hoverColor;
    }
    if (!showTooltip) return;
    
    setTooltipStyle(prevState => ({
      ...prevState,
      animation: undefined,
      visibility: "visible"
    }));
  }, [customStyle.hoverColor, showTooltip]);

  const handleOnMouseLeave = useCallback((event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    const target = event.currentTarget;
    const path = target.querySelector('path');
    if (path) {
      path.style.fill = customStyle.idleColor;
    }
    if (!showTooltip) return;
    
    setTooltipStyle(prevState => ({
      ...prevState,
      visibility: undefined,
      animation: `0.1s turkey_react_map_tooltip_fade_out forwards ease-out`,
    }));
  }, [customStyle.idleColor, showTooltip]);

  const getCities = useCallback((): GetCitiesReturn[] => {
    const { cities: cityData } = data;
    return cityData.map((city: CityType) => {
      const element = (
        <g 
          id={city.id}
          data-plakakodu={city.plateNumber}
          data-iladi={city.name}
          onMouseEnter={handleOnMouseEnter}
          onMouseLeave={handleOnMouseLeave}
          onMouseOver={event => hoverable ? handleOnHover(event) : undefined}
          onMouseMove={showTooltip ? handleOnMouseMove : undefined}
          onClick={handleOnClick}
        >
          <path style={{ cursor: "pointer", fill: customStyle.idleColor }} d={city.path} />
        </g>
      );
      return { element, cityType: city };
    });
  }, [data, hoverable, showTooltip, customStyle, handleOnMouseEnter, handleOnMouseLeave, handleOnHover, handleOnMouseMove, handleOnClick]);

  const renderCityWrapper = useCallback(() => {
    return getCities().map((param, index) => {
      const wrappedElement = cityWrapper ? cityWrapper(param.element, param.cityType) : param.element;
      return React.cloneElement(wrappedElement, { key: param.cityType.id });
    });
  }, [getCities, cityWrapper]);

  const handleCloseCountyMap = useCallback(() => {
    setSelectedCountyData(null);
  }, []);

  const handleCountyClickInternal = useCallback((county: CountyType) => {
    if (onCountyClick && selectedCountyData) {
      onCountyClick(county, selectedCountyData.city);
    }
  }, [onCountyClick, selectedCountyData]);

  const { top, left, width, height } = viewBox;

  return (
    <div id="svg-turkiye-haritasi-container" style={{ maxWidth: 1140, margin: "0 auto", textAlign: 'center' }} hidden={!visible}>
      {showTooltip && <Tooltip text={tooltipText || hoveredCityName} style={tooltipStyle} />}
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
          {renderCityWrapper()}
        </g>
      </svg>
      {showTooltip && <style>
        {`@keyframes turkey_react_map_tooltip_fade_out {
            0% {
              opacity: 1;
            }
            100% {
              visibility: hidden;
              opacity: 0;
            }
          }`}
      </style>}
      
      {/* County Map Popup */}
      {selectedCountyData && (() => {
        const countyMapPopup = (
          <CountyMapPopup
            countyData={selectedCountyData.countyData}
            onClose={handleCloseCountyMap}
            customStyle={customStyle}
            hoverable={hoverable}
            showTooltip={showTooltip}
            onCountyClick={handleCountyClickInternal}
          />
        );

        return countyMapWrapper 
          ? countyMapWrapper(countyMapPopup, selectedCountyData.city, selectedCountyData.countyData)
          : countyMapPopup;
      })()}
    </div>
  );
};

export default TurkeyMap;
