import React, { MouseEventHandler, useCallback, useState } from 'react';
import { Property } from 'csstype';

export type CountyType = { 
  id: string; 
  name: string; 
  path: string;
};

export type CountyData = {
  cityId: string;
  cityName: string;
  counties: CountyType[];
};

interface ICountyMapPopupProps {
  countyData: CountyData;
  onClose: () => void;
  customStyle?: { idleColor: string, hoverColor: string };
  hoverable?: boolean;
  showTooltip?: boolean;
  tooltipText?: string;
  onCountyHover?: (county: CountyType) => void;
  onCountyClick?: (county: CountyType) => void;
}

const CountyMapPopup: React.FC<ICountyMapPopupProps> = ({
  countyData,
  onClose,
  customStyle = { idleColor: "#444", hoverColor: "#dc3522" },
  hoverable = true,
  showTooltip = false,
  tooltipText,
  onCountyHover,
  onCountyClick
}) => {
  const [hoveredCountyName, setHoveredCountyName] = useState<string | undefined>(undefined);
  const [tooltipStyle, setTooltipStyle] = useState<{ 
    left: number, 
    top: number, 
    visibility?: Property.Visibility, 
    animation?: Property.Animation 
  }>({ left: 0, top: 0, visibility: "hidden" });

  const handleMouseEvent = useCallback((
    event: React.MouseEvent<SVGGElement, MouseEvent>, 
    callback: (county: CountyType) => void
  ) => {
    const element = event.target as Element;

    if (element.tagName === 'path') {
      const parent = element.parentNode as Element;

      const countyId = parent.getAttribute('id') ?? "";
      const countyPath = element.getAttribute("d") ?? "";
      const countyName: string = parent.getAttribute('data-ilceadi') ?? "";
      const county: CountyType = { id: countyId, name: countyName, path: countyPath };

      if (callback && typeof callback === 'function') {
        callback(county);
      }
    }
  }, []);

  const handleHover = useCallback((county: CountyType) => {
    setHoveredCountyName(county.name);
    if (onCountyHover) {
      onCountyHover(county);
    }
  }, [onCountyHover]);

  const handleOnHover = useCallback((event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    handleMouseEvent(event, handleHover);
  }, [handleMouseEvent, handleHover]);

  const handleOnClick = useCallback((event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    if (onCountyClick) {
      handleMouseEvent(event, onCountyClick);
    }
  }, [onCountyClick, handleMouseEvent]);

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
      animation: `0.1s county_react_map_tooltip_fade_out forwards ease-out`,
    }));
  }, [customStyle.idleColor, showTooltip]);

  const handleOverlayClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={handleOverlayClick}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '90%',
          maxHeight: '90%',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5em' }}>{countyData.cityName} - İlçeler</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5em',
              cursor: 'pointer',
              padding: '0 10px'
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div id="county-map-container" style={{ maxWidth: 800, margin: "0 auto", textAlign: 'center' }}>
          {showTooltip && (
            <div 
              id="county-map-tooltip"
              style={{
                ...tooltipStyle,
                position: 'absolute',
                padding: '5px 10px',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                color: 'white',
                borderRadius: '4px',
                fontSize: '14px',
                pointerEvents: 'none',
                zIndex: 1001
              }}
            >
              {tooltipText || hoveredCountyName}
            </div>
          )}
          
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            viewBox="0 0 1000 1000"
            xmlSpace="preserve"
            style={{ width: "100%", height: "auto" }}
          >
            <g key={countyData.cityId} id={countyData.cityId}>
              {countyData.counties.map((county) => (
                <g
                  key={county.id}
                  id={county.id}
                  data-ilceadi={county.name}
                  onMouseEnter={handleOnMouseEnter}
                  onMouseLeave={handleOnMouseLeave}
                  onMouseOver={event => hoverable ? handleOnHover(event) : undefined}
                  onMouseMove={showTooltip ? handleOnMouseMove : undefined}
                  onClick={handleOnClick}
                >
                  <path style={{ cursor: "pointer", fill: customStyle.idleColor }} d={county.path} />
                </g>
              ))}
            </g>
          </svg>
          
          {showTooltip && <style>
            {`@keyframes county_react_map_tooltip_fade_out {
                0% {
                  opacity: 1;
                }
                100% {
                  visibility: hidden;
                  opacity: 0;
                }
              }`}
          </style>}
        </div>
      </div>
    </div>
  );
};

export default CountyMapPopup;
