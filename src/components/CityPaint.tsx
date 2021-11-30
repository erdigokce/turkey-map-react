import React from 'react';
import {
  handleMouseEvent, onMouseEnter, onMouseLeave, onMouseMove,
} from '../service/event-service';
import { CityType, CustomStyleType, OnMouseEventCallback } from '../types';

export interface CityPaintSharedProps {
  hoverable: boolean;
  showTooltip: boolean;
  customStyle: CustomStyleType,
  onHover?: OnMouseEventCallback,
  onClick?: OnMouseEventCallback,
}

export interface CityPaintProps extends CityPaintSharedProps {
  city?: CityType;
  tooltipStyle?: React.CSSProperties;
  setSelectedCityId?: React.Dispatch<React.SetStateAction<number | undefined>>;
  setHoveredCityName?: React.Dispatch<React.SetStateAction<string | undefined>>;
  setTooltipStyle?: React.Dispatch<React.SetStateAction<React.CSSProperties>>;
}

const defaultProps: CityPaintProps = {
  hoverable: true,
  showTooltip: false,
  customStyle: { idleColor: '#444', hoverColor: '#dc3522' },
};

const CityPaint = ({
  city, hoverable, showTooltip, customStyle, tooltipStyle, setTooltipStyle, onHover, onClick, setSelectedCityId, setHoveredCityName,
} = defaultProps) => {
  const onCityHover = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    if (!setHoveredCityName || !city) {
      return;
    }
    setHoveredCityName(city.name);
    if (!onHover) {
      return;
    }
    if (hoverable) {
      onHover(event, city);
    }
  };

  const onCityClick = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    if (!onClick && setSelectedCityId) {
      const element = event.target as SVGGElement;

      if (element.tagName === 'path') {
        const parent = element.parentNode as Element;
        const cityPlateNumberText = `${parent.getAttribute('data-plakakodu')}`;
        const cityPlateNumber: number = parseInt(cityPlateNumberText !== '' ? cityPlateNumberText : '0', 10);
        setSelectedCityId(cityPlateNumber);
      }
      return;
    }
    handleMouseEvent(event, onClick);
  };

  const handleMouseEnter: React.MouseEventHandler<SVGGElement> = (event) => {
    if (!setTooltipStyle) {
      return;
    }
    onMouseEnter(event, {
      customStyle, setTooltipStyle, showTooltip, tooltipStyle,
    });
  };

  const handleMouseLeave: React.MouseEventHandler<SVGGElement> = (event) => {
    if (!setTooltipStyle) {
      return;
    }
    onMouseLeave(event, {
      customStyle, setTooltipStyle, showTooltip, tooltipStyle,
    });
  };

  const handleMouseMove: React.MouseEventHandler<SVGGElement> = (event) => {
    if (!setTooltipStyle) {
      return;
    }
    if (showTooltip) { return; }
    onMouseMove(event, {
      customStyle, setTooltipStyle, showTooltip, tooltipStyle,
    });
  };

  return (
    <g
      id={city?.id}
      data-plakakodu={city?.plateNumber}
      data-iladi={city?.name}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseOver={onCityHover}
      onMouseMove={handleMouseMove}
      onClick={onCityClick}
    >
      <path style={{ cursor: 'pointer', fill: customStyle.idleColor }} d={city?.path} />
    </g>
  );
};

export default CityPaint;
