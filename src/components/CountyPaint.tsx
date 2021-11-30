import React from 'react';
import {
  handleMouseEvent, onMouseEnter, onMouseLeave, onMouseMove,
} from '../service/event-service';
import { CountyType, CustomStyleType, OnMouseEventCallback } from '../types';

export interface CountyPaintSharedProps {
  hoverable: boolean;
  showTooltip: boolean;
  customStyle: CustomStyleType,
  onHover?: OnMouseEventCallback,
  onClick?: OnMouseEventCallback,
}

export interface CountyPaintProps extends CountyPaintSharedProps {
  county?: CountyType;
  tooltipStyle?: React.CSSProperties;
  setSelectedCountyId?: React.Dispatch<React.SetStateAction<number | undefined>>;
  setHoveredCountyName?: React.Dispatch<React.SetStateAction<string | undefined>>;
  setTooltipStyle?: React.Dispatch<React.SetStateAction<React.CSSProperties>>;
}

const defaultProps: CountyPaintProps = {
  hoverable: true,
  showTooltip: false,
  customStyle: { idleColor: '#444', hoverColor: '#dc3522' },
};

const CountyPaint = ({
  county, hoverable, showTooltip, customStyle, tooltipStyle, onHover, onClick, setHoveredCountyName, setSelectedCountyId, setTooltipStyle,
} = defaultProps) => {
  const onCountyHover = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    if (!setHoveredCountyName || !county) {
      return;
    }
    setHoveredCountyName(county.countyName);
    if (!onHover) {
      return;
    }
    if (hoverable) {
      onHover(event, county);
    }
  };

  const onCountyClick = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    if (!onClick && setSelectedCountyId) {
      const element = event.target as SVGGElement;

      if (element.tagName === 'path') {
        const parent = element.parentNode as Element;
        const cityPlateNumberText = `${parent.getAttribute('data-plakakodu')}`;
        const cityPlateNumber: number = parseInt(cityPlateNumberText !== '' ? cityPlateNumberText : '0', 10);
        setSelectedCountyId(cityPlateNumber);
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
    if (!setTooltipStyle || !showTooltip) {
      return;
    }
    onMouseMove(event, {
      customStyle, setTooltipStyle, showTooltip, tooltipStyle,
    });
  };

  return (
    <g
      id={`${county?.id}`}
      data-cityId={county?.cityId}
      data-priority={county?.priority}
      data-countyName={county?.countyName}
      data-subregions={county?.subregions}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseOver={onCountyHover}
      onMouseMove={handleMouseMove}
      onClick={onCountyClick}
    >
      <title>{county?.countyName}</title>
      <path style={{ cursor: 'pointer', fill: customStyle.idleColor }} d={county?.path!} />
    </g>
  );
};

export default CountyPaint;
