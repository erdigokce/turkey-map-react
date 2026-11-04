import {
  geoJsonToCities,
  type GeoJsonFeature,
  type GeoJsonFeatureCollection,
  type GeoJsonInput,
  type GeoJsonPolygonCoordinates,
} from '../geojson';
import {
  customKeyMultiPolygon,
  customKeyPolygon,
  defaultPolygon,
  lineFeature,
  mixedCollection,
  nullGeometryFeature,
  otherPolygon,
  pointFeature,
  squarePolygon,
  validCollection,
} from '../../tests/fixtures/geojson';

type Ring = Array<[number, number]>;

const parseRings = (path: string): Ring[] => (
  path.split('M ').slice(1).map((ring) => {
    const body = ring.trim().replace(/Z$/, '').trim();
    return body.split(' L ').map((point) => {
      const [x, y] = point.split(' ').map(Number);
      return [x, y] as [number, number];
    });
  })
);

const signedArea = (ring: Ring): number => {
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return area / 2;
};

const bounds = (rings: Ring[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} => {
  const points = rings.flat();
  return {
    minX: Math.min(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxX: Math.max(...points.map(([x]) => x)),
    maxY: Math.max(...points.map(([, y]) => y)),
  };
};

const polygonFeature = (
  properties: Record<string, unknown>,
  coordinates: unknown,
): GeoJsonFeature => ({
  type: 'Feature',
  properties,
  geometry: {
    type: 'Polygon',
    coordinates: coordinates as GeoJsonPolygonCoordinates,
  },
});

describe('geoJsonToCities', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('converts a Polygon with a hole and custom keys', () => {
    const cities = geoJsonToCities(customKeyPolygon, {
      idKey: 'ADM1_CODE',
      nameKey: 'NAME_1',
      plateKey: 'PLATE',
    });

    expect(cities).toHaveLength(1);
    expect(cities[0]).toMatchObject({
      id: 'TR34',
      name: 'Istanbul',
      plateNumber: 34,
    });
    expect(cities[0].disabled).toBeUndefined();
    expect(cities[0].path.trim()).toMatch(/^M /);
    expect(cities[0].path.trim()).toMatch(/Z$/);

    const rings = parseRings(cities[0].path);
    expect(rings).toHaveLength(2);
    expect(signedArea(rings[0]) * signedArea(rings[1])).toBeLessThan(0);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('converts a MultiPolygon into one city with every ring', () => {
    const cities = geoJsonToCities(customKeyMultiPolygon, {
      idKey: 'ADM1_CODE',
      nameKey: 'NAME_1',
      plateKey: 'PLATE',
    });

    expect(cities).toHaveLength(1);
    expect(cities[0].id).toBe('TR35');

    const rings = parseRings(cities[0].path);
    expect(rings).toHaveLength(3);
    expect(signedArea(rings[0])).toBeGreaterThan(0);
    expect(signedArea(rings[1])).toBeGreaterThan(0);
    expect(signedArea(rings[2])).toBeLessThan(0);
  });

  it('accepts a single Feature and uses default keys', () => {
    const cities = geoJsonToCities(defaultPolygon);

    expect(cities).toHaveLength(1);
    expect(cities[0]).toMatchObject({
      id: 'alpha',
      name: 'Alpha',
      plateNumber: 1,
    });
  });

  it('preserves order and fits all features in one coordinate system', () => {
    const cities = geoJsonToCities(validCollection);

    expect(cities.map((city) => city.id)).toEqual(['alpha', 'beta']);

    const alphaBounds = bounds(parseRings(cities[0].path));
    const betaBounds = bounds(parseRings(cities[1].path));

    expect(alphaBounds.maxX).toBeLessThan(betaBounds.minX);
  });

  it('passes properties, feature, and index to accessor functions', () => {
    const featureIndex = new Map<GeoJsonFeature, number>();
    const collection: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [defaultPolygon, otherPolygon],
    };

    collection.features.forEach((feature, index) => featureIndex.set(feature, index));

    const cities = geoJsonToCities(collection, {
      idKey: (properties, feature, index) => {
        featureIndex.set(feature, index);
        return `city-${String(properties.id)}`;
      },
      nameKey: (properties) => String(properties.name).toUpperCase(),
      plateKey: (properties, _feature, index) => index + 10,
    });

    expect(cities.map((city) => city.id)).toEqual(['city-alpha', 'city-beta']);
    expect(cities.map((city) => city.name)).toEqual(['ALPHA', 'BETA']);
    expect(cities.map((city) => city.plateNumber)).toEqual([10, 11]);
    expect(collection.features.map((feature) => featureIndex.get(feature))).toEqual([0, 1]);
  });

  it('falls back to the id for a missing name and 0 for a missing plate', () => {
    const feature = polygonFeature(
      { id: 'solo' },
      [[[0, 0], [1, 0], [1, 1], [0, 0]]],
    );

    const [city] = geoJsonToCities(feature);

    expect(city.name).toBe('solo');
    expect(city.plateNumber).toBe(0);
  });

  it('parses numeric-string plate values and rejects non-numeric ones', () => {
    const [stringPlate] = geoJsonToCities(otherPolygon);
    expect(stringPlate.plateNumber).toBe(2);

    const feature = polygonFeature(
      { id: 'weird', name: 'Weird', plateNumber: 'not-a-number' },
      [[[0, 0], [1, 0], [1, 1], [0, 0]]],
    );
    const [city] = geoJsonToCities(feature);
    expect(city.plateNumber).toBe(0);
  });

  it('accepts number ids and names', () => {
    const feature = polygonFeature(
      { id: 34, name: 34, plateNumber: 34 },
      [[[0, 0], [1, 0], [1, 1], [0, 0]]],
    );

    const [city] = geoJsonToCities(feature);

    expect(city).toMatchObject({ id: '34', name: '34', plateNumber: 34 });
  });

  it('skips features without a usable id and keeps the rest', () => {
    const collection: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        polygonFeature({}, [[[0, 0], [1, 0], [1, 1], [0, 0]]]),
        polygonFeature({ id: '   ' }, [[[0, 0], [1, 0], [1, 1], [0, 0]]]),
        polygonFeature({ id: NaN }, [[[0, 0], [1, 0], [1, 1], [0, 0]]]),
        polygonFeature({ id: true }, [[[0, 0], [1, 0], [1, 1], [0, 0]]]),
        defaultPolygon,
      ],
    };

    const cities = geoJsonToCities(collection);

    expect(cities.map((city) => city.id)).toEqual(['alpha']);
    expect(warnSpy).toHaveBeenCalledTimes(4);
  });

  it('preserves duplicate ids and warns', () => {
    const duplicate = polygonFeature(
      { id: 'alpha', name: 'Alpha again', plateNumber: 1 },
      [[[0, 0], [1, 0], [1, 1], [0, 0]]],
    );
    const collection: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [defaultPolygon, duplicate],
    };

    const cities = geoJsonToCities(collection);

    expect(cities.map((city) => city.id)).toEqual(['alpha', 'alpha']);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('duplicate city id "alpha"'),
    );
  });

  it('skips unsupported and null geometry', () => {
    const collection: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [pointFeature, lineFeature, nullGeometryFeature, defaultPolygon],
    };

    const cities = geoJsonToCities(collection);

    expect(cities.map((city) => city.id)).toEqual(['alpha']);
    expect(warnSpy).toHaveBeenCalledTimes(3);
  });

  it('skips malformed features and unsupported geometry types', () => {
    const collection = {
      type: 'FeatureCollection',
      features: [
        null,
        'nope',
        {},
        { type: 'Geometry', geometry: null },
        { type: 'Feature', properties: { id: 'empty' }, geometry: { type: 'Polygon', coordinates: [] } },
        { type: 'Feature', properties: { id: 'empty-multi' }, geometry: { type: 'MultiPolygon', coordinates: [] } },
        { type: 'Feature', properties: { id: 'missing-coordinates' }, geometry: { type: 'Polygon' } },
        { type: 'Feature', properties: { id: 'empty-polygon' }, geometry: { type: 'MultiPolygon', coordinates: [[]] } },
        { type: 'Feature', properties: { id: 'collection' }, geometry: { type: 'GeometryCollection', geometries: [] } },
      ],
    } as unknown as GeoJsonFeatureCollection;

    expect(geoJsonToCities(collection)).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('skips degenerate, non-finite, and malformed rings', () => {
    const collection: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        polygonFeature({ id: 'two-points' }, [[[0, 0], [1, 1], [0, 0]]]),
        polygonFeature({ id: 'collinear' }, [[[0, 0], [1, 1], [2, 2], [0, 0]]]),
        polygonFeature({ id: 'infinite' }, [[[0, 0], [Infinity, 0], [0, 1], [0, 0]]]),
        polygonFeature({ id: 'short-position' }, [[[0], [1, 0], [1, 1], [0, 0]]]),
        polygonFeature({ id: 'not-a-ring', }, [null]),
        polygonFeature({ id: 'string-position' }, [[[0, 0], ['1', 0], [1, 1], [0, 0]]]),
      ],
    };

    expect(geoJsonToCities(collection)).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(6);
  });

  it('removes closing and consecutive duplicates', () => {
    const feature = polygonFeature(
      { id: 'duplicates', name: 'Duplicates', plateNumber: 1 },
      [[
        [0, 0],
        [0, 0],
        [4, 0],
        [4, 4],
        [4, 4],
        [0, 4],
        [0, 0],
      ]],
    );

    const [city] = geoJsonToCities(feature);
    const [ring] = parseRings(city.path);

    expect(ring).toHaveLength(4);
    expect(new Set(ring.map((point) => point.join(','))).size).toBe(4);
  });

  it('ignores extra ordinates in positions', () => {
    const feature = polygonFeature(
      { id: 'altitude', name: 'Altitude', plateNumber: 1 },
      [[[0, 0, 100], [1, 0, 100], [1, 1, 100], [0, 0, 100]]],
    );

    expect(() => geoJsonToCities(feature)).not.toThrow();
  });

  it('applies custom projections once per position', () => {
    const project = jest.fn((lon: number, lat: number): [number, number] => [lat, lon]);
    const defaultResult = geoJsonToCities(squarePolygon);
    const [city] = geoJsonToCities(squarePolygon, { project });

    expect(project).toHaveBeenCalledTimes(5);
    expect(city.path).not.toBe(defaultResult[0].path);
  });

  it('skips features when a projection returns invalid coordinates', () => {
    const nonFinite = geoJsonToCities(squarePolygon, {
      project: (lon) => [lon, NaN],
    });
    const notAPair = geoJsonToCities(squarePolygon, {
      project: () => null as unknown as [number, number],
    });

    expect(nonFinite).toEqual([]);
    expect(notAPair).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('honors a custom viewBox and padding', () => {
    const [city] = geoJsonToCities(squarePolygon, {
      viewBox: { top: 0, left: 0, width: 100, height: 100 },
      padding: 10,
    });
    const result = bounds(parseRings(city.path));

    expect(result.minX).toBeCloseTo(10);
    expect(result.minY).toBeCloseTo(10);
    expect(result.maxX).toBeCloseTo(90);
    expect(result.maxY).toBeCloseTo(90);
  });

  it('fits geometry uniformly and centers it in a non-square viewBox', () => {
    const [city] = geoJsonToCities(squarePolygon, {
      viewBox: { top: 0, left: 0, width: 100, height: 200 },
    });
    const result = bounds(parseRings(city.path));

    expect(result.maxX - result.minX).toBeCloseTo(100);
    expect(result.maxY - result.minY).toBeCloseTo(100);
    expect(result.minY).toBeCloseTo(50);
    expect(result.maxY).toBeCloseTo(150);
  });

  it('clamps oversized padding instead of producing non-finite values', () => {
    const [city] = geoJsonToCities(squarePolygon, {
      viewBox: { top: 0, left: 0, width: 100, height: 100 },
      padding: 1000,
    });
    const result = bounds(parseRings(city.path));

    expect(Number.isFinite(result.minX)).toBe(true);
    expect(result.minX).toBeCloseTo(50);
    expect(result.maxX).toBeCloseTo(50);
  });

  it('rounds coordinates to the default precision', () => {
    const [city] = geoJsonToCities(customKeyPolygon, {
      idKey: 'ADM1_CODE',
      nameKey: 'NAME_1',
      plateKey: 'PLATE',
    });

    const decimals = city.path.match(/\.\d+/g) ?? [];
    for (const value of decimals) {
      expect(value.length - 1).toBeLessThanOrEqual(4);
    }
  });

  it('honors a custom precision and normalizes negative zero', () => {
    const [city] = geoJsonToCities(squarePolygon, { precision: 0 });
    const rings = parseRings(city.path);

    for (const point of rings.flat()) {
      expect(Number.isInteger(point[0])).toBe(true);
      expect(Number.isInteger(point[1])).toBe(true);
    }
    expect(city.path).not.toContain('-0');
  });

  it('falls back for invalid viewBox, padding, and precision options', () => {
    const [city] = geoJsonToCities(squarePolygon, {
      viewBox: { top: 0, left: 0, width: 0, height: 100 },
      padding: -1,
      precision: 1.5,
    });
    const result = bounds(parseRings(city.path));

    expect(result.minX).toBeGreaterThanOrEqual(80);
    expect(result.maxX).toBeLessThanOrEqual(1130);
    expect(warnSpy).toHaveBeenCalledTimes(3);
  });

  it('warns for each invalid numeric option variant', () => {
    geoJsonToCities(squarePolygon, { padding: NaN });
    geoJsonToCities(squarePolygon, { padding: Infinity });
    geoJsonToCities(squarePolygon, { precision: -1 });
    geoJsonToCities(squarePolygon, { precision: NaN });
    geoJsonToCities(squarePolygon, { precision: Infinity });
    geoJsonToCities(squarePolygon, {
      viewBox: { top: 0, left: 0, width: 10, height: -1 },
    });
    geoJsonToCities(squarePolygon, {
      viewBox: { top: 0, left: 0, width: 10, height: NaN },
    });

    expect(warnSpy).toHaveBeenCalledTimes(7);
  });

  it('returns an empty array for empty input', () => {
    const empty: GeoJsonFeatureCollection = { type: 'FeatureCollection', features: [] };

    expect(geoJsonToCities(empty)).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('returns an empty array when every feature is skipped', () => {
    expect(geoJsonToCities(mixedCollection, {
      idKey: 'missing',
      nameKey: 'missing',
      plateKey: 'missing',
    })).toEqual([]);
  });

  it('throws a TypeError for invalid top-level input', () => {
    const invalidInputs: unknown[] = [
      null,
      [],
      'FeatureCollection',
      { type: 'Unknown' },
      { type: 'FeatureCollection' },
      { type: 'FeatureCollection', features: 'no' },
      { type: 'Feature', properties: {} },
    ];

    for (const input of invalidInputs) {
      expect(() => geoJsonToCities(input as GeoJsonInput)).toThrow(TypeError);
    }

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('suppresses warnings in production', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      geoJsonToCities(pointFeature);
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('is deterministic', () => {
    const first = geoJsonToCities(validCollection);
    const second = geoJsonToCities(validCollection);

    expect(second).toEqual(first);
  });

  it('does not read window or document', () => {
    const globalObject = globalThis as unknown as {
      window?: unknown;
      document?: unknown;
    };
    const originalWindow = globalObject.window;
    const originalDocument = globalObject.document;
    delete globalObject.window;
    delete globalObject.document;

    try {
      expect(() => geoJsonToCities(validCollection)).not.toThrow();
    } finally {
      globalObject.window = originalWindow;
      globalObject.document = originalDocument;
    }
  });
});
