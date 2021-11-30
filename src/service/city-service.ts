import React from 'react';
import { CityType, CityWrapperType, GetCitiesReturn } from '../types';
import { CityPaint } from '../components';
import { CityPaintProps } from '../components/CityPaint';

export const getCities = (cities: CityType[], data: CityPaintProps): GetCitiesReturn[] => cities.map((city) => ({
  element: React.createElement<CityPaintProps>(CityPaint, { ...data, city }),
  cityType: city,
}));

export const wrapCity = (cities: CityType[], cityPaintProps: CityPaintProps, externalWrapper?: CityWrapperType) => getCities(cities, cityPaintProps)
  .map((param) => (externalWrapper ? externalWrapper(param.element, param.cityType) : param.element));

export default {
  getCities,
  wrapCity,
};
