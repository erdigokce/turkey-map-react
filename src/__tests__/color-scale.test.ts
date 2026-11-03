import {
  blendHexColors,
  createColorResolver,
  DEFAULT_COLOR_SCALE,
  getFiniteValue,
  getFiniteValues,
  getQuantile,
  isFiniteNumber,
  normalizeColorScale,
} from '../color-scale';
import type { ChoroplethValues, CityType, ColorScale, ScaleType } from '../types';
import { alpha, beta } from '../../tests/fixtures/cities';

const city = (id: string): CityType => ({
  id,
  plateNumber: 1,
  name: id,
  path: 'M 0 0 L 1 1 Z',
});

const resolve = (
  values: ChoroplethValues | undefined,
  options: {
    colorScale?: ColorScale;
    scaleType?: ScaleType;
    thresholds?: number[];
    getColor?: (value: number, cityValue: CityType) => string;
    noDataColor?: string;
  } = {},
): ((cityValue: CityType) => string) => createColorResolver({
  values,
  colorScale: options.colorScale,
  scaleType: options.scaleType,
  thresholds: options.thresholds,
  getColor: options.getColor,
  noDataColor: options.noDataColor ?? '#eeeeee',
});

describe('color-scale values', () => {
  it('recognizes finite numbers only', () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(-1.5)).toBe(true);
    expect(isFiniteNumber(Number.NaN)).toBe(false);
    expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isFiniteNumber('1')).toBe(false);
    expect(isFiniteNumber(null)).toBe(false);
  });

  it('reads only own finite values for a city', () => {
    const values = { alpha: 10, beta: Number.NaN } as ChoroplethValues;

    expect(getFiniteValue(undefined, 'alpha')).toBeUndefined();
    expect(getFiniteValue(values, 'alpha')).toBe(10);
    expect(getFiniteValue(values, 'beta')).toBeUndefined();
    expect(getFiniteValue(values, 'missing')).toBeUndefined();
    expect(getFiniteValue(values, 'toString')).toBeUndefined();
  });

  it('collects finite values and ignores invalid entries', () => {
    const values = {
      alpha: 10,
      beta: Number.POSITIVE_INFINITY,
      gamma: '20',
      delta: -5,
      epsilon: Number.NaN,
    } as unknown as ChoroplethValues;

    expect(getFiniteValues(undefined)).toEqual([]);
    expect(getFiniteValues(values)).toEqual([10, -5]);
  });

  it('ignores inherited keys', () => {
    const values = Object.create({ inherited: 99 }) as ChoroplethValues;
    values.alpha = 5;

    expect(getFiniteValue(values, 'inherited')).toBeUndefined();
    expect(getFiniteValues(values)).toEqual([5]);
  });
});

describe('color-scale normalization', () => {
  it('uses the default palette when no scale is supplied', () => {
    const normalized = normalizeColorScale(undefined);

    expect(normalized.colors).toEqual(DEFAULT_COLOR_SCALE);
    expect(normalized.colors).not.toBe(DEFAULT_COLOR_SCALE);
    expect(normalized.colorFunction).toBeUndefined();
  });

  it('keeps a usable string array', () => {
    expect(normalizeColorScale(['#000', '', '#fff']).colors).toEqual(['#000', '#fff']);
  });

  it('falls back for an empty or unusable array', () => {
    expect(normalizeColorScale([]).colors).toEqual(DEFAULT_COLOR_SCALE);
    expect(normalizeColorScale([1, null] as unknown as ColorScale).colors).toEqual(
      DEFAULT_COLOR_SCALE,
    );
  });

  it('keeps a function scale and supplies default colors', () => {
    const colorScale = (value: number): string => (value > 0 ? '#000' : '#fff');
    const normalized = normalizeColorScale(colorScale);

    expect(normalized.colorFunction).toBe(colorScale);
    expect(normalized.colors).toEqual(DEFAULT_COLOR_SCALE);
  });

  it('treats a non-array, non-function runtime value as absent', () => {
    expect(
      normalizeColorScale(42 as unknown as ColorScale).colors,
    ).toEqual(DEFAULT_COLOR_SCALE);
  });
});

describe('color-scale hex blending', () => {
  it('blends six-digit hex colors', () => {
    expect(blendHexColors('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(blendHexColors('#000000', '#ffffff', 0)).toBe('#000000');
    expect(blendHexColors('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('supports three-digit hex colors', () => {
    expect(blendHexColors('#fff', '#000', 1)).toBe('#000000');
    expect(blendHexColors('#000', '#fff', 0)).toBe('#000000');
  });

  it('uses the nearer stop when a color cannot be interpolated', () => {
    expect(blendHexColors('red', '#0000ff', 0.25)).toBe('red');
    expect(blendHexColors('#000000', 'blue', 0.75)).toBe('blue');
  });

  it('clamps the blend ratio', () => {
    expect(blendHexColors('#000000', '#ffffff', -1)).toBe('#000000');
    expect(blendHexColors('#000000', '#ffffff', 2)).toBe('#ffffff');
  });
});

describe('color-scale quantiles', () => {
  it('handles empty and single-value inputs', () => {
    expect(getQuantile([], 0.5)).toBe(0);
    expect(getQuantile([7], 0.5)).toBe(7);
  });

  it('returns exact values or interpolates between neighbors', () => {
    const values = [1, 2, 3, 4];

    expect(getQuantile(values, 0)).toBe(1);
    expect(getQuantile(values, 1)).toBe(4);
    expect(getQuantile(values, 0.5)).toBe(2.5);
    expect(getQuantile(values, 0.25)).toBe(1.75);
  });
});

describe('linear scale', () => {
  it('uses endpoint colors', () => {
    const resolver = resolve({ alpha: 0, beta: 100 }, {
      colorScale: ['#000000', '#ffffff'],
    });

    expect(resolver(alpha)).toBe('#000000');
    expect(resolver(beta)).toBe('#ffffff');
  });

  it('blends between two colors', () => {
    const middle = city('middle');
    const resolver = resolve({ alpha: 0, beta: 100, middle: 50 }, {
      colorScale: ['#000000', '#ffffff'],
    });

    expect(resolver(middle)).toBe('#808080');
  });

  it('interpolates across multiple stops', () => {
    const quarter = city('quarter');
    const middle = city('middle');
    const resolver = resolve({ alpha: 0, beta: 100, quarter: 25, middle: 50 }, {
      colorScale: ['#000000', '#ff0000', '#ffffff'],
    });

    expect(resolver(quarter)).toBe('#800000');
    expect(resolver(middle)).toBe('#ff0000');
  });

  it('uses the nearer stop for non-hex colors', () => {
    const quarter = city('quarter');
    const middle = city('middle');
    const resolver = resolve({ alpha: 0, beta: 100, quarter: 25, middle: 50 }, {
      colorScale: ['red', '#0000ff'],
    });

    expect(resolver(quarter)).toBe('red');
    expect(resolver(middle)).toBe('#0000ff');
  });

  it('returns the only color for a single-color scale', () => {
    const resolver = resolve({ alpha: 0, beta: 100 }, {
      colorScale: ['#123456'],
    });

    expect(resolver(alpha)).toBe('#123456');
    expect(resolver(beta)).toBe('#123456');
  });

  it('uses the last color for a collapsed domain', () => {
    const resolver = resolve({ alpha: 42, beta: 42 }, {
      colorScale: ['#000000', '#ffffff'],
    });

    expect(resolver(alpha)).toBe('#ffffff');
    expect(resolver(beta)).toBe('#ffffff');
  });

  it('treats an unknown runtime scale type as linear', () => {
    const resolver = resolve({ alpha: 0, beta: 100 }, {
      colorScale: ['#000000', '#ffffff'],
      scaleType: 'unknown' as ScaleType,
    });

    expect(resolver(alpha)).toBe('#000000');
    expect(resolver(beta)).toBe('#ffffff');
  });
});

describe('quantize scale', () => {
  const values = {
    a: 0,
    b: 22,
    c: 23,
    d: 44,
    e: 46,
    f: 67,
    g: 68,
    h: 90,
  };
  const colors = ['#111111', '#222222', '#333333', '#444444'];
  const resolver = resolve(values, { colorScale: colors, scaleType: 'quantize' });

  it('assigns equal-width buckets including the endpoints', () => {
    expect(resolver(city('a'))).toBe('#111111');
    expect(resolver(city('b'))).toBe('#111111');
    expect(resolver(city('c'))).toBe('#222222');
    expect(resolver(city('d'))).toBe('#222222');
    expect(resolver(city('e'))).toBe('#333333');
    expect(resolver(city('f'))).toBe('#333333');
    expect(resolver(city('g'))).toBe('#444444');
    expect(resolver(city('h'))).toBe('#444444');
  });

  it('uses the last color for a collapsed domain', () => {
    const collapsed = resolve({ alpha: 42 }, {
      colorScale: colors,
      scaleType: 'quantize',
    });

    expect(collapsed(alpha)).toBe('#444444');
  });
});

describe('quantile scale', () => {
  it('creates equal-count buckets', () => {
    const values = { a: 1, b: 2, c: 3, d: 4 };
    const resolver = resolve(values, {
      colorScale: ['#000000', '#ffffff'],
      scaleType: 'quantile',
    });

    expect(resolver(city('a'))).toBe('#000000');
    expect(resolver(city('b'))).toBe('#000000');
    expect(resolver(city('c'))).toBe('#ffffff');
    expect(resolver(city('d'))).toBe('#ffffff');
  });

  it('handles duplicate values deterministically', () => {
    const values = { a: 5, b: 5, c: 5, d: 5 };
    const resolver = resolve(values, {
      colorScale: ['#000000', '#ffffff'],
      scaleType: 'quantile',
    });

    expect(resolver(city('a'))).toBe('#ffffff');
    expect(resolver(city('d'))).toBe('#ffffff');
  });

  it('uses the last color for a collapsed domain', () => {
    const resolver = resolve({ alpha: 42, beta: 42 }, {
      colorScale: ['#000000', '#ffffff'],
      scaleType: 'quantile',
    });

    expect(resolver(alpha)).toBe('#ffffff');
  });

  it('uses the only color when there is one bucket', () => {
    const resolver = resolve({ alpha: 1, beta: 2 }, {
      colorScale: ['#123456'],
      scaleType: 'quantile',
    });

    expect(resolver(alpha)).toBe('#123456');
    expect(resolver(beta)).toBe('#123456');
  });
});

describe('threshold scale', () => {
  const colors = ['#111111', '#222222', '#333333', '#444444'];
  const values = {
    below: 9,
    first: 10,
    middle: 24,
    second: 25,
    upper: 49,
    third: 50,
    far: 100,
  };

  it('assigns colors from explicit thresholds', () => {
    const resolver = resolve(values, {
      colorScale: colors,
      scaleType: 'threshold',
      thresholds: [10, 25, 50],
    });

    expect(resolver(city('below'))).toBe('#111111');
    expect(resolver(city('first'))).toBe('#222222');
    expect(resolver(city('middle'))).toBe('#222222');
    expect(resolver(city('second'))).toBe('#333333');
    expect(resolver(city('upper'))).toBe('#333333');
    expect(resolver(city('third'))).toBe('#444444');
    expect(resolver(city('far'))).toBe('#444444');
  });

  it('sorts unsorted thresholds', () => {
    const resolver = resolve(values, {
      colorScale: colors,
      scaleType: 'threshold',
      thresholds: [50, 10, 25],
    });

    expect(resolver(city('first'))).toBe('#222222');
    expect(resolver(city('third'))).toBe('#444444');
  });

  it('ignores non-finite threshold entries', () => {
    const resolver = resolve({ alpha: 25, beta: 60 }, {
      colorScale: ['#111111', '#222222', '#333333'],
      scaleType: 'threshold',
      thresholds: [10, Number.NaN, 50],
    });

    expect(resolver(alpha)).toBe('#222222');
    expect(resolver(beta)).toBe('#333333');
  });

  it('does not apply the collapsed-domain shortcut', () => {
    const resolver = resolve({ alpha: 42, beta: 42 }, {
      colorScale: colors,
      scaleType: 'threshold',
      thresholds: [10, 25, 50],
    });

    expect(resolver(alpha)).toBe('#333333');
  });

  it('falls back to quantize and warns when thresholds are missing', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const resolver = resolve({ alpha: 0, beta: 100 }, {
      colorScale: ['#000000', '#ffffff'],
      scaleType: 'threshold',
    });

    expect(resolver(alpha)).toBe('#000000');
    expect(resolver(beta)).toBe('#ffffff');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('threshold');
  });

  it('falls back when the threshold count does not match the colors', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const resolver = resolve({ alpha: 0, beta: 100 }, {
      colorScale: ['#000000', '#ffffff'],
      scaleType: 'threshold',
      thresholds: [10, 25],
    });

    expect(resolver(alpha)).toBe('#000000');
    expect(resolver(beta)).toBe('#ffffff');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not warn in production', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      resolve({ alpha: 0, beta: 100 }, {
        colorScale: ['#000000', '#ffffff'],
        scaleType: 'threshold',
      });
    } finally {
      process.env.NODE_ENV = originalEnv;
    }

    expect(warn).not.toHaveBeenCalled();
  });
});

describe('function scales and getColor', () => {
  it('calls a function scale with raw values and ignores scaleType', () => {
    const colorScale = jest.fn((value: number) => (value > 50 ? '#ffffff' : '#000000'));
    const resolver = resolve({ alpha: 10, beta: 90 }, {
      colorScale,
      scaleType: 'quantile',
      thresholds: [50],
    });

    expect(resolver(alpha)).toBe('#000000');
    expect(resolver(beta)).toBe('#ffffff');
    expect(colorScale.mock.calls).toEqual([[10], [90]]);
  });

  it('falls back to no-data for invalid function output', () => {
    const emptyResolver = resolve({ alpha: 10 }, {
      colorScale: () => '',
      noDataColor: '#abcdef',
    });
    const undefinedResolver = resolve({ alpha: 10 }, {
      colorScale: () => undefined as unknown as string,
      noDataColor: '#abcdef',
    });
    const nonStringResolver = resolve({ alpha: 10 }, {
      colorScale: () => 5 as unknown as string,
      noDataColor: '#abcdef',
    });

    expect(emptyResolver(alpha)).toBe('#abcdef');
    expect(undefinedResolver(alpha)).toBe('#abcdef');
    expect(nonStringResolver(alpha)).toBe('#abcdef');
  });

  it('lets getColor win over both scale forms and receive the city', () => {
    const colorScale = jest.fn(() => '#ffffff');
    const getColor = jest.fn((value: number, cityValue: CityType) => (
      `${cityValue.id}-${value}`
    ));
    const resolver = resolve({ alpha: 10 }, {
      colorScale,
      getColor,
    });

    expect(resolver(alpha)).toBe('alpha-10');
    expect(getColor).toHaveBeenCalledWith(10, alpha);
    expect(colorScale).not.toHaveBeenCalled();
  });

  it('falls back to the function scale when getColor returns an invalid value', () => {
    const resolver = resolve({ alpha: 10 }, {
      colorScale: () => '#ffffff',
      getColor: () => '',
    });

    expect(resolver(alpha)).toBe('#ffffff');
  });

  it('falls back to the array scale when getColor returns an invalid value', () => {
    const resolver = resolve({ alpha: 0, beta: 100 }, {
      colorScale: ['#000000', '#ffffff'],
      getColor: () => undefined as unknown as string,
    });

    expect(resolver(alpha)).toBe('#000000');
    expect(resolver(beta)).toBe('#ffffff');
  });

  it('skips getColor for provinces without a value', () => {
    const getColor = jest.fn(() => '#000000');
    const resolver = resolve({ alpha: 10 }, {
      getColor,
      noDataColor: '#abcdef',
    });

    expect(resolver(beta)).toBe('#abcdef');
    expect(getColor).not.toHaveBeenCalledWith(expect.anything(), beta);
  });

  it('uses no-data for every city when values are absent', () => {
    const resolver = resolve(undefined, { noDataColor: '#abcdef' });

    expect(resolver(alpha)).toBe('#abcdef');
  });

  it('uses no-data for invalid values', () => {
    const resolver = resolve({ alpha: Number.NaN } as ChoroplethValues, {
      noDataColor: '#abcdef',
    });

    expect(resolver(alpha)).toBe('#abcdef');
  });
});
