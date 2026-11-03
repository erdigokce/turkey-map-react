import type { CityType } from '../src/types';

export type CountingCity = {
  city: CityType;
  counts: { name: number; path: number };
  reset: () => void;
  total: () => number;
};

export const createCountingCity = (
  id: string,
  plateNumber: number,
  name: string,
  path: string,
): CountingCity => {
  const counts = { name: 0, path: 0 };
  const city: CityType = {
    id,
    plateNumber,
    get name() {
      counts.name += 1;
      return name;
    },
    get path() {
      counts.path += 1;
      return path;
    },
  };

  return {
    city,
    counts,
    reset: () => {
      counts.name = 0;
      counts.path = 0;
    },
    total: () => counts.name + counts.path,
  };
};

export const resetCounts = (...cities: CountingCity[]): void => {
  cities.forEach((city) => city.reset());
};

export const expectOnlyRendered = (
  cities: Record<string, CountingCity>,
  renderedIds: string[],
): void => {
  Object.entries(cities).forEach(([id, countingCity]) => {
    if (renderedIds.includes(id)) {
      expect(countingCity.total()).toBeGreaterThan(0);
    } else {
      expect(countingCity.total()).toBe(0);
    }
  });
};
