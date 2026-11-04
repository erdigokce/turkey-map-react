import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
} from '../../src/geojson';

export const defaultPolygon: GeoJsonFeature = {
  type: 'Feature',
  properties: {
    id: 'alpha',
    name: 'Alpha',
    plateNumber: 1,
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0],
      ],
      [
        [1, 1],
        [3, 1],
        [3, 3],
        [1, 3],
        [1, 1],
      ],
    ],
  },
};

export const otherPolygon: GeoJsonFeature = {
  type: 'Feature',
  properties: {
    id: 'beta',
    name: 'Beta',
    plateNumber: '2',
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [6, 0],
        [8, 0],
        [8, 2],
        [6, 2],
        [6, 0],
      ],
    ],
  },
};

export const squarePolygon: GeoJsonFeature = {
  type: 'Feature',
  properties: {
    id: 'square',
    name: 'Square',
    plateNumber: 0,
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ],
  },
};

export const customKeyPolygon: GeoJsonFeature = {
  type: 'Feature',
  properties: {
    ADM1_CODE: 'TR34',
    NAME_1: 'Istanbul',
    PLATE: '34',
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [28, 41],
        [29, 41],
        [29, 42],
        [28, 42],
        [28, 41],
      ],
      [
        [28.4, 41.4],
        [28.6, 41.4],
        [28.6, 41.6],
        [28.4, 41.6],
        [28.4, 41.4],
      ],
    ],
  },
};

export const customKeyMultiPolygon: GeoJsonFeature = {
  type: 'Feature',
  properties: {
    ADM1_CODE: 'TR35',
    NAME_1: 'Izmir',
    PLATE: 35,
  },
  geometry: {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [26, 38],
          [26.5, 38],
          [26.5, 38.5],
          [26, 38.5],
          [26, 38],
        ],
      ],
      [
        [
          [27, 38],
          [27.5, 38],
          [27.5, 38.5],
          [27, 38.5],
          [27, 38],
        ],
        [
          [27.1, 38.1],
          [27.2, 38.1],
          [27.2, 38.2],
          [27.1, 38.2],
          [27.1, 38.1],
        ],
      ],
    ],
  },
};

export const pointFeature: GeoJsonFeature = {
  type: 'Feature',
  properties: { id: 'point' },
  geometry: {
    type: 'Point',
    coordinates: [1, 2],
  },
};

export const lineFeature: GeoJsonFeature = {
  type: 'Feature',
  properties: { id: 'line' },
  geometry: {
    type: 'LineString',
    coordinates: [
      [0, 0],
      [1, 1],
    ],
  },
};

export const nullGeometryFeature: GeoJsonFeature = {
  type: 'Feature',
  properties: { id: 'empty' },
  geometry: null,
};

export const mixedCollection: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    defaultPolygon,
    otherPolygon,
    pointFeature,
    lineFeature,
    nullGeometryFeature,
    customKeyPolygon,
    customKeyMultiPolygon,
  ],
};

export const validCollection: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [defaultPolygon, otherPolygon],
};
