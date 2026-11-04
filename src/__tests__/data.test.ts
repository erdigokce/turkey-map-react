import { createHash } from 'crypto';
import { cities } from '../data';
import type { Region } from '../city-type';

const REGIONS: Region[] = [
  'marmara',
  'ege',
  'akdeniz',
  'ic-anadolu',
  'karadeniz',
  'dogu-anadolu',
  'guneydogu-anadolu',
];

const DEFAULT_VIEWBOX = {
  minX: 0,
  maxX: 1050,
  minY: 80,
  maxY: 665,
};

const BASE_DATA_FINGERPRINT = '78897a8e90f7535d269240294f9ac7aa3c69c94be71251e7c32a45506d4550e8';

describe('built-in city data', () => {
  it('contains all 81 Turkish provinces', () => {
    expect(cities).toHaveLength(81);
  });

  it('uses unique, URL-safe city ids', () => {
    const ids = cities.map((city) => city.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('contains every plate number from 1 to 81 exactly once', () => {
    const plateNumbers = cities
      .map((city) => city.plateNumber)
      .sort((a, b) => a - b);

    expect(plateNumbers).toEqual(
      Array.from({ length: 81 }, (_, index) => index + 1),
    );
  });

  it('has a non-empty name and path for every city', () => {
    for (const city of cities) {
      expect(city.name.trim()).not.toBe('');
      expect(city.path.trim()).not.toBe('');
    }
  });

  it('has a well-formed SVG path for every city', () => {
    for (const city of cities) {
      expect(city.path.trim()).toMatch(/^M\s/);
      expect(city.path.trim()).toMatch(/[zZ]$/);
    }
  });

  it('keeps the original id, plate, name, and path values', () => {
    const fingerprint = createHash('sha256')
      .update(
        [...cities]
          .sort((first, second) => first.plateNumber - second.plateNumber)
          .map((city) => [city.id, city.plateNumber, city.name, city.path].join('|'))
          .join('\n'),
      )
      .digest('hex');

    expect(fingerprint).toBe(BASE_DATA_FINGERPRINT);
  });

  it('populates the required geography fields for every province', () => {
    for (const city of cities) {
      expect(REGIONS).toContain(city.region);
      expect(city.centroid).toBeDefined();
      expect(city.neighbors).toBeDefined();
      expect(city.areaKm2).toBeDefined();
      expect(city.population).toBeDefined();
      expect(city.isoCode).toBeDefined();
      expect(city.nutsCode).toBeDefined();
    }
  });

  it('uses only the documented regions', () => {
    const usedRegions = new Set(cities.map((city) => city.region));

    for (const region of usedRegions) {
      expect(REGIONS).toContain(region);
    }
    expect(usedRegions.size).toBe(REGIONS.length);
  });

  it('places every centroid inside the default viewBox', () => {
    for (const city of cities) {
      expect(city.centroid).toBeDefined();
      const { x, y } = city.centroid as { x: number; y: number };

      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(DEFAULT_VIEWBOX.minX);
      expect(x).toBeLessThanOrEqual(DEFAULT_VIEWBOX.maxX);
      expect(y).toBeGreaterThanOrEqual(DEFAULT_VIEWBOX.minY);
      expect(y).toBeLessThanOrEqual(DEFAULT_VIEWBOX.maxY);
    }
  });

  it('has a valid, symmetric, non-empty adjacency list for every province', () => {
    const cityIds = new Set(cities.map((city) => city.id));

    for (const city of cities) {
      expect(city.neighbors).toBeDefined();
      const neighbors = city.neighbors as string[];

      expect(neighbors.length).toBeGreaterThan(0);
      expect(new Set(neighbors).size).toBe(neighbors.length);
      expect(neighbors).not.toContain(city.id);

      for (const neighborId of neighbors) {
        expect(cityIds.has(neighborId)).toBe(true);
        const neighbor = cities.find((candidate) => candidate.id === neighborId);
        expect(neighbor).toBeDefined();
        expect(neighbor?.neighbors).toContain(city.id);
      }
    }
  });

  it('has positive area and population values', () => {
    for (const city of cities) {
      expect(Number.isFinite(city.areaKm2)).toBe(true);
      expect(city.areaKm2).toBeGreaterThan(0);
      expect(Number.isInteger(city.population)).toBe(true);
      expect(city.population).toBeGreaterThan(0);
    }
  });

  it('has well-formed, unique ISO and NUTS codes', () => {
    const isoCodes = cities.map((city) => city.isoCode);
    const nutsCodes = cities.map((city) => city.nutsCode);

    expect(new Set(isoCodes).size).toBe(isoCodes.length);
    expect(new Set(nutsCodes).size).toBe(nutsCodes.length);

    for (const city of cities) {
      expect(city.isoCode).toBe(`TR-${String(city.plateNumber).padStart(2, '0')}`);
      expect(city.nutsCode).toMatch(/^TR[0-9A-C]{3}$/);
    }
  });

  it('has meaningful alternative names when present', () => {
    for (const city of cities) {
      if (!city.altNames) {
        continue;
      }

      expect(city.altNames.length).toBeGreaterThan(0);
      for (const altName of city.altNames) {
        expect(altName.trim()).not.toBe('');
        expect(altName).not.toBe(city.name);
      }
    }
  });

  it('leaves meta to consumers', () => {
    for (const city of cities) {
      expect(city.meta).toBeUndefined();
    }
  });
});
