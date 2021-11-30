import React, { useState } from 'react';
import Tooltip from './Tooltip';
import styles from './index.css';
import {
  CityType, CityWrapperType, Counties, CountyWrapperType, ViewBoxType,
} from './types';
import { wrapCity } from './service/city-service';
import { wrapCounty } from './service/county-service';
import { CityPaintSharedProps } from './components/CityPaint';
import * as data from './data';

interface IProps extends CityPaintSharedProps {
  viewBox: ViewBoxType,
  visible: boolean,
  tooltipText?: string,
  cities: CityType[],
  counties: Counties,
  cityWrapper?: CityWrapperType,
  countyWrapper?: CountyWrapperType,
}

const TurkeyMap = (props: IProps) => {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ left: 0, top: 0, visibility: 'hidden' });
  const [selectedCityId, setSelectedCityId] = useState<number>();
  const [hoveredCityName, setHoveredCityName] = useState<string>();

  const {
    viewBox, showTooltip, hoverable, tooltipText, customStyle, visible, cities, counties, cityWrapper, countyWrapper,
  } = props;

  const {
    top, left, width, height,
  } = viewBox;

  const cityPaintProps = {
    hoverable,
    showTooltip,
    customStyle,
    setSelectedCityId,
    setHoveredCityName,
    setTooltipStyle,
  };

  const countyPaintProps = {
    hoverable,
    showTooltip,
    customStyle,
    setTooltipStyle,
  };

  return (
    <div id="svg-turkiye-haritasi-container" style={{ maxWidth: 1140, margin: '0 auto', textAlign: 'center' }} hidden={!visible}>
      {showTooltip && <Tooltip text={tooltipText || hoveredCityName} style={tooltipStyle} />}
      <svg id="svg-turkiye-haritasi" viewBox={`${top} ${left} ${width} ${height}`} className={styles.citiesContainer}>
        <g key="turkiye" id="turkiye">
          {wrapCity(cities, cityPaintProps)}
        </g>
      </svg>
      {selectedCityId && (
      <svg id="svg-sehir-haritasi" viewBox={`${top} 0 ${width} ${height}`} className={styles.countiesContainer}>
        <g id={`${selectedCityId}`}>
          {wrapCounty(counties, selectedCityId, countyPaintProps)}
        </g>
      </svg>
      )}
    </div>
  );
};

TurkeyMap.defaultProps = {
  viewBox: {
    top: 0, left: 80, width: 1050, height: 585,
  },
  visible: true,
  hoverable: true,
  showTooltip: false,
  customStyle: { idleColor: '#444', hoverColor: '#dc3522' },
  cities: data.cities,
  counties: data.counties,
} as Partial<IProps>;

export default TurkeyMap;
