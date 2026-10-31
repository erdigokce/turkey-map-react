import type { CityType } from '../../src';

export const alpha: CityType = {
  id: 'alpha',
  plateNumber: 1,
  name: 'Alpha',
  path: 'M 0 0 L 10 10 L 0 10 Z',
};

export const beta: CityType = {
  id: 'beta',
  plateNumber: 2,
  name: 'Beta',
  path: 'M 20 20 L 30 30 L 20 30 Z',
};

export const testCities: CityType[] = [alpha, beta];

export const testData = { cities: testCities };
