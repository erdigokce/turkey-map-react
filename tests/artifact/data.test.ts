const dataBundle = require('../../lib/data/index.js');

const cities = dataBundle.cities as Array<{
  id: string;
  plateNumber: number;
  name: string;
  path: string;
}>;

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
});
