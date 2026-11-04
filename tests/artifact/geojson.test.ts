import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  customKeyMultiPolygon,
  customKeyPolygon,
  defaultPolygon,
  pointFeature,
} from '../fixtures/geojson';

const { geoJsonToCities } = require('../../lib/geojson.js');
const coreBundle = require('../../lib/core.js');
const CoreTurkeyMap = coreBundle.default || coreBundle;

const getCityGroup = (container: HTMLElement, name: string): SVGGElement | null => (
  container.querySelector(`g[data-iladi="${name}"]`)
);

const getPathData = (group: SVGGElement | null): string => {
  const path = group?.querySelector('path');
  if (!path) {
    throw new Error('Expected a rendered city path');
  }
  return path.getAttribute('d') ?? '';
};

describe('published geojson bundle', () => {
  it('converts a Polygon with a hole and renders it through the core component', () => {
    const cities = geoJsonToCities(customKeyPolygon, {
      idKey: 'ADM1_CODE',
      nameKey: 'NAME_1',
      plateKey: 'PLATE',
    });
    const { container } = render(<CoreTurkeyMap data={{ cities }} />);
    const group = getCityGroup(container, 'Istanbul');
    const path = getPathData(group);

    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute('id', 'TR34');
    expect(path).toBe(cities[0].path);
    expect(path.match(/M /g)).toHaveLength(2);
    expect(path).toMatch(/Z$/);
  });

  it('renders every MultiPolygon ring as one city path', () => {
    const cities = geoJsonToCities(customKeyMultiPolygon, {
      idKey: 'ADM1_CODE',
      nameKey: 'NAME_1',
      plateKey: 'PLATE',
    });
    const { container } = render(<CoreTurkeyMap data={{ cities }} />);
    const path = getPathData(getCityGroup(container, 'Izmir'));

    expect(path.match(/M /g)).toHaveLength(3);
    expect(path).toBe(cities[0].path);
  });

  it('renders default-key data and skips unsupported geometry', () => {
    const cities = geoJsonToCities({
      type: 'FeatureCollection',
      features: [defaultPolygon, pointFeature],
    });
    const { container } = render(<CoreTurkeyMap data={{ cities }} />);

    expect(cities).toHaveLength(1);
    expect(getCityGroup(container, 'Alpha')).toBeInTheDocument();
    expect(getCityGroup(container, 'point')).toBeNull();
  });

  it('returns an empty array for unsupported input features', () => {
    const cities = geoJsonToCities({
      type: 'FeatureCollection',
      features: [pointFeature],
    });

    expect(cities).toEqual([]);
  });
});
