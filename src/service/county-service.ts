import React from 'react';
import { CountyPaint } from '../components';
import { CountyPaintProps } from '../components/CountyPaint';
import {
  Counties, CountyType, CountyWrapperType, GetCountiesReturn,
} from '../types';

export const getCounties = (counties: CountyType[], data: CountyPaintProps): GetCountiesReturn[] => counties.map((county) => ({
  element: React.createElement<CountyPaintProps>(CountyPaint, { ...data, county }),
  countyType: county,
}));

export const wrapCounty = (counties: Counties, cityId: number, countyPaintProps: CountyPaintProps, externalWrapper?: CountyWrapperType) => {
  const countiesOfTheCity = counties[cityId - 1];
  return (
    getCounties(countiesOfTheCity, countyPaintProps).map((param) => (externalWrapper ? externalWrapper(param.element, param.countyType) : param.element))
  );
};

export default {
  getCounties,
  wrapCounty,
};
