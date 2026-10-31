import { cities } from '../data';

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
});
