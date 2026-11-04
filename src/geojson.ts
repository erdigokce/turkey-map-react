import type { CityType } from './city-type';

export type GeoJsonPosition = [number, number, ...number[]];
export type GeoJsonLinearRing = GeoJsonPosition[];
export type GeoJsonPolygonCoordinates = GeoJsonLinearRing[];
export type GeoJsonMultiPolygonCoordinates = GeoJsonPolygonCoordinates[];

export type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: GeoJsonPolygonCoordinates;
};

export type GeoJsonMultiPolygon = {
  type: 'MultiPolygon';
  coordinates: GeoJsonMultiPolygonCoordinates;
};

export type GeoJsonUnsupportedGeometry = {
  type: string;
  coordinates?: unknown;
};

export type GeoJsonGeometry =
  | GeoJsonPolygon
  | GeoJsonMultiPolygon
  | GeoJsonUnsupportedGeometry;

export type GeoJsonFeature = {
  type: 'Feature';
  geometry: GeoJsonGeometry | null;
  properties?: Record<string, unknown> | null;
  id?: string | number;
};

export type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
};

export type GeoJsonInput = GeoJsonFeatureCollection | GeoJsonFeature;
export type GeoJsonProperties = Record<string, unknown>;

export type GeoJsonKeyAccessor = (
  properties: GeoJsonProperties,
  feature: GeoJsonFeature,
  index: number,
) => string | number | null | undefined;

export type GeoJsonKey = string | GeoJsonKeyAccessor;

export type GeoJsonProject = (lon: number, lat: number) => [number, number];

export type GeoJsonViewBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type GeoJsonToCitiesOptions = {
  idKey?: GeoJsonKey;
  nameKey?: GeoJsonKey;
  plateKey?: GeoJsonKey;
  project?: GeoJsonProject;
  viewBox?: GeoJsonViewBox;
  padding?: number;
  precision?: number;
};

type ProjectedPoint = [number, number];
type ProjectedRing = ProjectedPoint[];
type ProjectedPolygon = ProjectedRing[];

type PendingCity = {
  id: string;
  name: string;
  plateNumber: number;
  polygons: ProjectedPolygon[];
};

type ResolvedOptions = {
  idKey: GeoJsonKey;
  nameKey: GeoJsonKey;
  plateKey: GeoJsonKey;
  project: GeoJsonProject;
  viewBox: GeoJsonViewBox;
  padding: number;
  precision: number;
};

type Transform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

const DEFAULT_VIEW_BOX: GeoJsonViewBox = {
  top: 0,
  left: 80,
  width: 1050,
  height: 585,
};
const DEFAULT_PRECISION = 4;

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const warn = (message: string): void => {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    console.warn(`turkey-map-react: ${message}`);
  }
};

const getInputFeatures = (input: unknown): GeoJsonFeature[] => {
  if (!isRecord(input)) {
    throw new TypeError(
      'turkey-map-react/geojson: expected a GeoJSON FeatureCollection or Feature object.',
    );
  }

  if (input.type === 'FeatureCollection') {
    if (!Array.isArray(input.features)) {
      throw new TypeError(
        'turkey-map-react/geojson: a FeatureCollection must have a features array.',
      );
    }
    return input.features as GeoJsonFeature[];
  }

  if (input.type === 'Feature') {
    if (!('geometry' in input)) {
      throw new TypeError(
        'turkey-map-react/geojson: a Feature must have a geometry property.',
      );
    }
    return [input as unknown as GeoJsonFeature];
  }

  throw new TypeError(
    `turkey-map-react/geojson: unsupported GeoJSON type "${String(input.type)}".`,
  );
};

const normalizeViewBox = (value: unknown): GeoJsonViewBox => {
  if (
    isRecord(value)
    && isFiniteNumber(value.top)
    && isFiniteNumber(value.left)
    && isFiniteNumber(value.width)
    && isFiniteNumber(value.height)
    && value.width > 0
    && value.height > 0
  ) {
    return {
      top: value.top,
      left: value.left,
      width: value.width,
      height: value.height,
    };
  }

  if (value !== undefined) {
    warn('invalid viewBox option; using the default view box.');
  }

  return DEFAULT_VIEW_BOX;
};

const normalizePadding = (value: unknown): number => {
  if (value === undefined) {
    return 0;
  }

  if (isFiniteNumber(value) && value >= 0) {
    return value;
  }

  warn('invalid padding option; using 0.');
  return 0;
};

const normalizePrecision = (value: unknown): number => {
  if (value === undefined) {
    return DEFAULT_PRECISION;
  }

  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return Math.min(value, 100);
  }

  warn(`invalid precision option; using ${DEFAULT_PRECISION}.`);
  return DEFAULT_PRECISION;
};

const resolveOptions = (options: GeoJsonToCitiesOptions): ResolvedOptions => {
  const source = options ?? {};

  return {
    idKey: source.idKey ?? 'id',
    nameKey: source.nameKey ?? 'name',
    plateKey: source.plateKey ?? 'plateNumber',
    project: source.project ?? ((lon, lat) => [lon, -lat]),
    viewBox: normalizeViewBox(source.viewBox),
    padding: normalizePadding(source.padding),
    precision: normalizePrecision(source.precision),
  };
};

const resolveKey = (
  key: GeoJsonKey,
  properties: GeoJsonProperties,
  feature: GeoJsonFeature,
  index: number,
): unknown => (
  typeof key === 'function' ? key(properties, feature, index) : properties[key]
);

const toId = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
};

const toName = (value: unknown): string | undefined => toId(value);

const toPlateNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const projectRing = (
  ring: unknown,
  project: GeoJsonProject,
): ProjectedRing | undefined => {
  if (!Array.isArray(ring)) {
    return undefined;
  }

  const points: ProjectedRing = [];

  for (const position of ring) {
    if (!Array.isArray(position) || position.length < 2) {
      return undefined;
    }

    const lon = position[0];
    const lat = position[1];
    if (!isFiniteNumber(lon) || !isFiniteNumber(lat)) {
      return undefined;
    }

    const projected = project(lon, lat);
    if (!Array.isArray(projected) || projected.length < 2) {
      return undefined;
    }

    const x = projected[0];
    const y = projected[1];
    if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
      return undefined;
    }

    const previous = points[points.length - 1];
    if (previous && previous[0] === x && previous[1] === y) {
      continue;
    }

    points.push([x, y]);
  }

  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
      points.pop();
    }
  }

  return points.length >= 3 ? points : undefined;
};

const signedArea = (ring: ProjectedRing): number => {
  let area = 0;

  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    area += current[0] * next[1] - next[0] * current[1];
  }

  return area / 2;
};

const normalizeWinding = (
  ring: ProjectedRing,
  isHole: boolean,
): ProjectedRing | undefined => {
  const area = signedArea(ring);

  if (area === 0) {
    return undefined;
  }

  const reverse = isHole ? area > 0 : area < 0;

  return reverse ? [...ring].reverse() : ring;
};

const extractPolygons = (
  geometry: Record<string, unknown>,
  project: GeoJsonProject,
  id: string,
): ProjectedPolygon[] | undefined => {
  let polygonsInput: unknown;

  if (geometry.type === 'Polygon') {
    polygonsInput = [geometry.coordinates];
  } else if (geometry.type === 'MultiPolygon') {
    polygonsInput = geometry.coordinates;
  } else {
    warn(
      `feature "${id}" uses unsupported geometry type "${String(geometry.type)}"; skipped.`,
    );
    return undefined;
  }

  if (!Array.isArray(polygonsInput) || polygonsInput.length === 0) {
    warn(`feature "${id}" has no polygon coordinates; skipped.`);
    return undefined;
  }

  const polygons: ProjectedPolygon[] = [];

  for (const polygon of polygonsInput) {
    if (!Array.isArray(polygon) || polygon.length === 0) {
      warn(`feature "${id}" has an empty polygon; skipped.`);
      return undefined;
    }

    const rings: ProjectedRing[] = [];

    for (let ringIndex = 0; ringIndex < polygon.length; ringIndex += 1) {
      const projected = projectRing(polygon[ringIndex], project);
      if (!projected) {
        warn(`feature "${id}" has an unusable ring; skipped.`);
        return undefined;
      }

      const normalized = normalizeWinding(projected, ringIndex > 0);
      if (!normalized) {
        warn(`feature "${id}" has a degenerate ring; skipped.`);
        return undefined;
      }

      rings.push(normalized);
    }

    polygons.push(rings);
  }

  return polygons;
};

const convertFeature = (
  feature: unknown,
  index: number,
  options: ResolvedOptions,
): PendingCity | undefined => {
  if (!isRecord(feature) || feature.type !== 'Feature') {
    warn(`feature at index ${index} is not a GeoJSON Feature; skipped.`);
    return undefined;
  }

  const typedFeature = feature as unknown as GeoJsonFeature;
  const properties = isRecord(typedFeature.properties) ? typedFeature.properties : {};
  const id = toId(resolveKey(options.idKey, properties, typedFeature, index));

  if (id === undefined) {
    warn(`feature at index ${index} has no usable id; skipped.`);
    return undefined;
  }

  const name = toName(resolveKey(options.nameKey, properties, typedFeature, index)) ?? id;
  const plateNumber = toPlateNumber(
    resolveKey(options.plateKey, properties, typedFeature, index),
  );

  if (!isRecord(typedFeature.geometry)) {
    warn(`feature "${id}" has no usable geometry; skipped.`);
    return undefined;
  }

  const polygons = extractPolygons(typedFeature.geometry, options.project, id);
  if (!polygons) {
    return undefined;
  }

  return {
    id,
    name,
    plateNumber,
    polygons,
  };
};

const createTransform = (
  cities: PendingCity[],
  options: ResolvedOptions,
): Transform | undefined => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const city of cities) {
    for (const polygon of city.polygons) {
      for (const ring of polygon) {
        for (const point of ring) {
          if (point[0] < minX) {
            minX = point[0];
          }
          if (point[1] < minY) {
            minY = point[1];
          }
          if (point[0] > maxX) {
            maxX = point[0];
          }
          if (point[1] > maxY) {
            maxY = point[1];
          }
        }
      }
    }
  }

  const spanX = maxX - minX;
  const spanY = maxY - minY;

  /* istanbul ignore if -- valid non-zero-area rings always span both axes */
  if (!isFiniteNumber(spanX) || !isFiniteNumber(spanY) || spanX === 0 || spanY === 0) {
    warn('projected geometry has no area; no cities were converted.');
    return undefined;
  }

  const { top, left, width, height } = options.viewBox;
  const padding = Math.min(options.padding, Math.min(width, height) / 2);
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const scale = Math.min(availableWidth / spanX, availableHeight / spanY);

  return {
    scale,
    offsetX: left + padding + (availableWidth - spanX * scale) / 2 - minX * scale,
    offsetY: top + padding + (availableHeight - spanY * scale) / 2 - minY * scale,
  };
};

const formatCoordinate = (value: number, precision: number): string => {
  const rounded = Number(value.toFixed(precision));
  return String(Object.is(rounded, -0) ? 0 : rounded);
};

const serializeRing = (
  ring: ProjectedRing,
  transform: Transform,
  precision: number,
): string => {
  const points = ring.map(([x, y]) => (
    `${formatCoordinate(x * transform.scale + transform.offsetX, precision)} `
    + formatCoordinate(y * transform.scale + transform.offsetY, precision)
  ));

  return `M ${points[0]} L ${points.slice(1).join(' L ')} Z`;
};

const serializeCity = (city: PendingCity, transform: Transform, precision: number): string => (
  city.polygons
    .map((rings) => rings.map((ring) => serializeRing(ring, transform, precision)).join(' '))
    .join(' ')
);

/**
 * Converts GeoJSON polygon features into the `CityType[]` shape accepted by
 * the map's `data` prop.
 */
export function geoJsonToCities(
  input: GeoJsonInput,
  options: GeoJsonToCitiesOptions = {},
): CityType[] {
  const features = getInputFeatures(input as unknown);
  const resolved = resolveOptions(options);
  const cities: PendingCity[] = [];
  const seenIds = new Set<string>();

  features.forEach((feature, index) => {
    const city = convertFeature(feature, index, resolved);
    if (!city) {
      return;
    }

    if (seenIds.has(city.id)) {
      warn(`duplicate city id "${city.id}"; the duplicate is kept in the output.`);
    }
    seenIds.add(city.id);
    cities.push(city);
  });

  if (cities.length === 0) {
    return [];
  }

  const transform = createTransform(cities, resolved);
  /* istanbul ignore if -- createTransform only fails for impossible zero-area input */
  if (!transform) {
    return [];
  }

  return cities.map((city) => ({
    id: city.id,
    name: city.name,
    plateNumber: city.plateNumber,
    path: serializeCity(city, transform, resolved.precision),
  }));
}
