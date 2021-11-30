/* eslint-disable no-param-reassign */
import React, { MouseEvent } from 'react';
import { CityType, CustomStyleType, OnMouseEvent } from '../types';
import styles from '../index.css';

type MouseEventData = {
  tooltipStyle?: React.CSSProperties;
  setTooltipStyle: React.Dispatch<React.SetStateAction<React.CSSProperties>>;
  showTooltip: boolean;
  customStyle: CustomStyleType,
}

export const onMouseEnter = (event: MouseEvent, data: MouseEventData) => {
  const {
    customStyle, showTooltip, setTooltipStyle, tooltipStyle,
  } = data;
  (event.target as SVGGElement).style.fill = customStyle.hoverColor;
  if (!showTooltip) { return; }
  setTooltipStyle({ ...tooltipStyle, animation: undefined, visibility: 'visible' });
};

export const onMouseLeave = (event: MouseEvent, data: MouseEventData) => {
  const {
    customStyle, showTooltip, setTooltipStyle, tooltipStyle,
  } = data;
  (event.target as SVGGElement).style.fill = customStyle.idleColor;
  if (!showTooltip) { return; }
  setTooltipStyle({ ...tooltipStyle, visibility: undefined, animation: `0.1s ${styles.fadeOut} forwards ease-out` });
};

export const onMouseMove = (event: MouseEvent, data: MouseEventData) => {
  const { setTooltipStyle, tooltipStyle } = data;
  setTooltipStyle({ ...tooltipStyle, left: event.pageX + 16, top: event.pageY - 32 });
};

export const handleMouseEvent: OnMouseEvent = (event, callback) => {
  const element = event.target as SVGGElement;

  if (element.tagName === 'path') {
    const parent = element.parentNode as Element;

    const cityId = `${parent.getAttribute('id')}`;
    const cityPath = `${element.getAttribute('d')}`;
    const cityPlateNumberText = `${parent.getAttribute('data-plakakodu')}`;
    const cityPlateNumber: number = parseInt(cityPlateNumberText !== '' ? cityPlateNumberText : '0', 10);
    const cityName: string = `${parent.getAttribute('data-iladi')}`;
    const city: CityType = {
      id: cityId, name: cityName, plateNumber: cityPlateNumber, path: cityPath,
    };

    if (callback && typeof callback === 'function') {
      callback(event, city);
    }
  }
};
