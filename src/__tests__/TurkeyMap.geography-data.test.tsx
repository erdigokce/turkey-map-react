import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import type { CityType } from '../city-type';
import { testData } from '../../tests/fixtures/cities';
import { getCityGroup, getCityGroups, getCityPath } from '../../tests/helpers';

type RichCity = Omit<CityType, 'meta'> & { meta: { sales: number } };

const richCities: RichCity[] = [
  {
    id: 'alpha',
    plateNumber: 1,
    name: 'Alpha',
    path: 'M 0 0 L 10 10 L 0 10 Z',
    region: 'ege',
    centroid: { x: 5, y: 5 },
    neighbors: ['beta'],
    areaKm2: 100,
    population: 1000,
    isoCode: 'TR-01',
    nutsCode: 'TR100',
    altNames: ['Alpha City'],
    meta: { sales: 42 },
  },
  {
    id: 'beta',
    plateNumber: 2,
    name: 'Beta',
    path: 'M 20 20 L 30 30 L 20 30 Z',
    region: 'marmara',
    centroid: { x: 25, y: 25 },
    neighbors: ['alpha'],
    areaKm2: 200,
    population: 2000,
    isoCode: 'TR-02',
    nutsCode: 'TR211',
    meta: { sales: 7 },
  },
];

const richData = { cities: richCities };

describe('rich geography data', () => {
  it('passes the complete city object to onHover and onClick', () => {
    const onHover = jest.fn();
    const onClick = jest.fn();
    const { container } = render(
      <TurkeyMap data={richData} onHover={onHover} onClick={onClick} />,
    );
    const path = getCityPath(getCityGroup(container, 'Alpha'));

    fireEvent.mouseOver(path);
    fireEvent.click(path);

    expect(onHover).toHaveBeenCalledWith(richCities[0]);
    expect(onClick).toHaveBeenCalledWith(richCities[0]);
    expect(onHover.mock.calls[0][0].meta.sales).toBe(42);
    expect(onClick.mock.calls[0][0].centroid).toEqual({ x: 5, y: 5 });
  });

  it('passes the complete city object to selection callbacks', () => {
    const onSelect = jest.fn();
    const onSelectionChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={richData}
        selectionMode="single"
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));

    expect(onSelect).toHaveBeenCalledWith(richCities[0]);
    expect(onSelectionChange).toHaveBeenCalledWith([richCities[0]]);
  });

  it('passes the complete city object to getCityStyle and isCityDisabled', () => {
    const getCityStyle = jest.fn(() => undefined);
    const isCityDisabled = jest.fn(() => false);
    const { container } = render(
      <TurkeyMap
        data={richData}
        getCityStyle={getCityStyle}
        isCityDisabled={isCityDisabled}
      />,
    );

    fireEvent.mouseOver(getCityPath(getCityGroup(container, 'Alpha')));

    expect(getCityStyle).toHaveBeenCalledWith(
      richCities[0],
      expect.objectContaining({ hovered: true }),
    );
    expect(isCityDisabled).toHaveBeenCalledWith(richCities[0]);
  });

  it('preserves metadata when cityWrapper is used', () => {
    const onHover = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={richData}
        onHover={onHover}
        cityWrapper={(element, city) => <g data-wrapper={city.id}>{element}</g>}
      />,
    );

    fireEvent.mouseOver(getCityPath(getCityGroup(container, 'Alpha')));

    expect(onHover).toHaveBeenCalledWith(expect.objectContaining({
      id: 'alpha',
      name: 'Alpha',
      plateNumber: 1,
      region: 'ege',
      centroid: { x: 5, y: 5 },
      meta: { sales: 42 },
    }));
  });

  it('passes the complete city object on keyboard activation without selection', () => {
    const onClick = jest.fn();
    const { container } = render(
      <TurkeyMap data={richData} onClick={onClick} />,
    );
    const group = getCityGroup(container, 'Alpha');

    fireEvent.focus(group);
    fireEvent.keyDown(group, { key: 'Enter' });

    expect(onClick).toHaveBeenCalledWith(richCities[0]);
  });

  it('passes the complete city object to renderTooltip', () => {
    const renderTooltip = jest.fn((city: RichCity) => (
      <span>{city.name}:{city.meta.sales}</span>
    ));
    const { container } = render(
      <TurkeyMap
        data={richData}
        showTooltip={true}
        tooltipDelay={0}
        renderTooltip={renderTooltip}
      />,
    );

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));

    expect(renderTooltip).toHaveBeenCalledWith(
      richCities[0],
      undefined,
    );
  });

  it('keeps the default render and plain custom data unchanged', () => {
    const { container: defaultContainer } = render(<TurkeyMap />);
    const defaultGroups = getCityGroups(defaultContainer);

    expect(defaultGroups).toHaveLength(81);
    for (const group of defaultGroups) {
      expect(group.getAttribute('id')).toBeTruthy();
      expect(group.getAttribute('data-plakakodu')).toBeTruthy();
      expect(group.getAttribute('data-iladi')).toBeTruthy();
      expect(getCityPath(group).getAttribute('d')).toBeTruthy();
    }

    const { container: customContainer } = render(<TurkeyMap data={testData} />);
    const customGroups = getCityGroups(customContainer);

    expect(customGroups).toHaveLength(2);
    expect(getCityGroup(customContainer, 'Alpha')).toHaveAttribute('id', 'alpha');
    expect(getCityGroup(customContainer, 'Alpha')).toHaveAttribute('data-plakakodu', '1');
    expect(getCityGroup(customContainer, 'Beta')).toHaveAttribute('id', 'beta');
  });
});
