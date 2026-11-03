import type {
  ChoroplethValues,
  CityType,
  ColorScale,
  ColorScaleFunction,
  GetColorCallback,
  ScaleType,
} from './types';

export const DEFAULT_COLOR_SCALE = ['#f7fbff', '#08306b'];

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type ColorResolverConfig = {
  values?: ChoroplethValues;
  colorScale?: ColorScale;
  scaleType?: ScaleType;
  thresholds?: number[];
  getColor?: GetColorCallback;
  noDataColor: string;
};

type NormalizedColorScale = {
  colors: string[];
  colorFunction?: ColorScaleFunction;
};

const isNonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.length > 0
);

export const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

export const getFiniteValue = (
  values: ChoroplethValues | undefined,
  cityId: string,
): number | undefined => {
  if (!values || !Object.prototype.hasOwnProperty.call(values, cityId)) {
    return undefined;
  }

  const value = values[cityId];
  return isFiniteNumber(value) ? value : undefined;
};

export const getFiniteValues = (values: ChoroplethValues | undefined): number[] => {
  if (!values) {
    return [];
  }

  const result: number[] = [];
  Object.keys(values).forEach((key) => {
    const value = values[key];
    if (isFiniteNumber(value)) {
      result.push(value);
    }
  });
  return result;
};

export const normalizeColorScale = (
  colorScale: ColorScale | undefined,
): NormalizedColorScale => {
  if (typeof colorScale === 'function') {
    return {
      colors: DEFAULT_COLOR_SCALE.slice(),
      colorFunction: colorScale,
    };
  }

  if (Array.isArray(colorScale)) {
    const colors = colorScale.filter(isNonEmptyString);
    if (colors.length > 0) {
      return { colors };
    }
  }

  return { colors: DEFAULT_COLOR_SCALE.slice() };
};

const parseHexColor = (color: string): RgbColor | undefined => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) {
    return undefined;
  }

  const hex = match[1].length === 3
    ? match[1].split('').map((character) => character + character).join('')
    : match[1];

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
};

const toHexChannel = (value: number): string => (
  Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0')
);

export const blendHexColors = (from: string, to: string, ratio: number): string => {
  const start = parseHexColor(from);
  const end = parseHexColor(to);

  if (!start || !end) {
    return ratio < 0.5 ? from : to;
  }

  const clampedRatio = Math.min(1, Math.max(0, ratio));
  const blendChannel = (startChannel: number, endChannel: number): string => (
    toHexChannel(startChannel + (endChannel - startChannel) * clampedRatio)
  );

  return `#${blendChannel(start.r, end.r)}${blendChannel(start.g, end.g)}${blendChannel(start.b, end.b)}`;
};

export const getQuantile = (sortedValues: number[], probability: number): number => {
  if (sortedValues.length === 0) {
    return 0;
  }
  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const index = (sortedValues.length - 1) * probability;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  return sortedValues[lowerIndex]
    + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * (index - lowerIndex);
};

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.min(maximum, Math.max(minimum, value))
);

const resolveLinearColor = (
  value: number,
  minimum: number,
  maximum: number,
  colors: string[],
): string => {
  if (colors.length === 1) {
    return colors[0];
  }

  const ratio = clamp((value - minimum) / (maximum - minimum), 0, 1);
  const scaled = ratio * (colors.length - 1);
  const lowerIndex = Math.floor(scaled);

  if (lowerIndex >= colors.length - 1) {
    return colors[colors.length - 1];
  }

  const localRatio = scaled - lowerIndex;
  if (localRatio === 0) {
    return colors[lowerIndex];
  }

  return blendHexColors(colors[lowerIndex], colors[lowerIndex + 1], localRatio);
};

const resolveQuantizeColor = (
  value: number,
  minimum: number,
  maximum: number,
  colors: string[],
): string => {
  const ratio = clamp((value - minimum) / (maximum - minimum), 0, 1);
  const index = Math.min(colors.length - 1, Math.floor(ratio * colors.length));
  return colors[index];
};

const buildQuantileBoundaries = (sortedValues: number[], bucketCount: number): number[] => {
  const boundaries: number[] = [];

  for (let index = 1; index < bucketCount; index += 1) {
    boundaries.push(getQuantile(sortedValues, index / bucketCount));
  }

  return boundaries;
};

const resolveQuantileColor = (
  value: number,
  colors: string[],
  boundaries: number[],
): string => {
  let index = 0;
  boundaries.forEach((boundary) => {
    if (boundary <= value) {
      index += 1;
    }
  });

  return colors[Math.min(index, colors.length - 1)];
};

const resolveThresholdColor = (
  value: number,
  colors: string[],
  thresholds: number[],
): string => {
  let index = 0;
  thresholds.forEach((threshold) => {
    if (threshold <= value) {
      index += 1;
    }
  });

  return colors[Math.min(index, colors.length - 1)];
};

const warnInDevelopment = (message: string): void => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.warn(message);
  }
};

export const createColorResolver = (
  config: ColorResolverConfig,
): ((city: CityType) => string) => {
  const {
    values,
    colorScale,
    scaleType = 'linear',
    thresholds,
    getColor,
    noDataColor,
  } = config;
  const normalized = normalizeColorScale(colorScale);
  const colors = normalized.colors;
  const colorFunction = normalized.colorFunction;
  const finiteValues = getFiniteValues(values);
  const minimum = finiteValues.length > 0 ? Math.min(...finiteValues) : 0;
  const maximum = finiteValues.length > 0 ? Math.max(...finiteValues) : 0;
  const sortedValues = finiteValues.slice().sort((first, second) => first - second);
  const sortedThresholds = (thresholds ?? [])
    .filter(isFiniteNumber)
    .sort((first, second) => first - second);

  let effectiveScaleType: ScaleType = scaleType;

  if (
    !colorFunction
    && scaleType === 'threshold'
    && (!thresholds || colors.length !== sortedThresholds.length + 1)
  ) {
    warnInDevelopment(
      'turkey-map-react: scaleType="threshold" requires thresholds.length + 1 colors; falling back to "quantize".',
    );
    effectiveScaleType = 'quantize';
  }

  const quantileBoundaries = effectiveScaleType === 'quantile' && !colorFunction
    ? buildQuantileBoundaries(sortedValues, colors.length)
    : [];

  return (city: CityType): string => {
    const value = getFiniteValue(values, city.id);

    if (value === undefined) {
      return noDataColor;
    }

    if (getColor) {
      const customColor = getColor(value, city);
      if (isNonEmptyString(customColor)) {
        return customColor;
      }
    }

    if (colorFunction) {
      const customColor = colorFunction(value);
      return isNonEmptyString(customColor) ? customColor : noDataColor;
    }

    if (effectiveScaleType !== 'threshold' && minimum === maximum) {
      return colors[colors.length - 1];
    }

    switch (effectiveScaleType) {
      case 'quantize':
        return resolveQuantizeColor(value, minimum, maximum, colors);
      case 'quantile':
        return resolveQuantileColor(value, colors, quantileBoundaries);
      case 'threshold':
        return resolveThresholdColor(value, colors, sortedThresholds);
      case 'linear':
      default:
        return resolveLinearColor(value, minimum, maximum, colors);
    }
  };
};
