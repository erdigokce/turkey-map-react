const dataBundle = require('../../lib/data/index.js');

type Region =
  | 'marmara'
  | 'ege'
  | 'akdeniz'
  | 'ic-anadolu'
  | 'karadeniz'
  | 'dogu-anadolu'
  | 'guneydogu-anadolu';

type PublishedCity = {
  id: string;
  plateNumber: number;
  name: string;
  path: string;
  region?: Region;
  centroid?: { x: number; y: number };
  neighbors?: string[];
  areaKm2?: number;
  population?: number;
  isoCode?: string;
  nutsCode?: string;
  altNames?: string[];
  meta?: Record<string, unknown>;
};

const cities = dataBundle.cities as PublishedCity[];

const REGIONS: Region[] = [
  'marmara',
  'ege',
  'akdeniz',
  'ic-anadolu',
  'karadeniz',
  'dogu-anadolu',
  'guneydogu-anadolu',
];

describe('published data bundle', () => {
  it('exports all 81 built-in cities', () => {
    expect(Array.isArray(cities)).toBe(true);
    expect(cities).toHaveLength(81);
  });

  it('keeps ids unique and URL-safe', () => {
    const ids = cities.map((city) => city.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('contains every plate number exactly once', () => {
    const plateNumbers = cities
      .map((city) => city.plateNumber)
      .sort((first, second) => first - second);

    expect(plateNumbers).toEqual(
      Array.from({ length: 81 }, (_, index) => index + 1),
    );
  });

  it('has a non-empty name and SVG path for every city', () => {
    for (const city of cities) {
      expect(city.name.trim()).not.toBe('');
      expect(city.path.trim()).toMatch(/^M\s/);
    }
  });

  it('preserves the rich geography fields through the build', () => {
    for (const city of cities) {
      expect(REGIONS).toContain(city.region);
      expect(city.centroid).toBeDefined();
      expect(Number.isFinite(city.centroid?.x)).toBe(true);
      expect(Number.isFinite(city.centroid?.y)).toBe(true);
      expect(city.neighbors?.length).toBeGreaterThan(0);
      expect(city.areaKm2).toBeGreaterThan(0);
      expect(city.population).toBeGreaterThan(0);
      expect(city.isoCode).toBe(`TR-${String(city.plateNumber).padStart(2, '0')}`);
      expect(city.nutsCode).toMatch(/^TR[0-9A-C]{3}$/);
      expect(city.meta).toBeUndefined();
    }
  });

  it('keeps ISO and NUTS codes unique', () => {
    const isoCodes = cities.map((city) => city.isoCode);
    const nutsCodes = cities.map((city) => city.nutsCode);

    expect(new Set(isoCodes).size).toBe(isoCodes.length);
    expect(new Set(nutsCodes).size).toBe(nutsCodes.length);
  });

  it('keeps adjacency valid and symmetric', () => {
    const cityIds = new Set(cities.map((city) => city.id));

    for (const city of cities) {
      const neighbors = city.neighbors as string[];

      expect(new Set(neighbors).size).toBe(neighbors.length);
      expect(neighbors).not.toContain(city.id);

      for (const neighborId of neighbors) {
        expect(cityIds.has(neighborId)).toBe(true);
        const neighbor = cities.find((candidate) => candidate.id === neighborId);
        expect(neighbor?.neighbors).toContain(city.id);
      }
    }
  });
});
