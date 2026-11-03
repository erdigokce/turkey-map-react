import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import RootTurkeyMap from '../index';
import CoreTurkeyMap from '../core';
import { cities } from '../data';
import { alpha, beta, testData } from '../../tests/fixtures/cities';
import {
  getCityGroup,
  getCityGroups,
  getCityPath,
  getTooltip,
} from '../../tests/helpers';

const CoreWithoutData = CoreTurkeyMap as unknown as React.FC<Record<string, never>>;

describe('entry points', () => {
  it('root renders all 81 built-in provinces when no data is supplied', () => {
    const { container } = render(<RootTurkeyMap />);

    expect(getCityGroups(container)).toHaveLength(81);
    expect(getCityGroup(container, 'Bursa')).toHaveAttribute('id', 'bursa');
  });

  it('root renders only custom data when supplied', () => {
    const { container } = render(<RootTurkeyMap data={testData} />);

    expect(getCityGroups(container)).toHaveLength(2);
    expect(getCityGroup(container, 'Alpha')).toBeInTheDocument();
    expect(container.querySelector('g[data-iladi="Bursa"]')).toBeNull();
  });

  it('core renders supplied custom data', () => {
    const { container } = render(<CoreTurkeyMap data={testData} />);

    expect(getCityGroups(container)).toHaveLength(2);
    expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveAttribute('d', alpha.path);
  });

  it('core renders no provinces when data is omitted at runtime', () => {
    const { container } = render(<CoreWithoutData />);

    expect(getCityGroups(container)).toHaveLength(0);
    expect(container.querySelector('#svg-turkiye-haritasi')).toBeInTheDocument();
  });

  it('core supports selection, disabled, tooltip, and custom styles', () => {
    const onClick = jest.fn();
    const { container } = render(
      <CoreTurkeyMap
        data={testData}
        selectionMode="multiple"
        defaultSelectedCities={[alpha.id]}
        disabledCities={[beta.id]}
        showTooltip={true}
        customStyle={{ idleColor: '#111111', hoverColor: '#222222' }}
        onClick={onClick}
      />,
    );

    expect(getCityGroup(container, 'Alpha')).toHaveAttribute('tabindex', '0');
    expect(getCityGroup(container, 'Beta')).toHaveAttribute('aria-disabled', 'true');
    expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveStyle({
      fill: 'var(--tm-selected-color, #dc3522)',
    });

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
    expect(getTooltip(container)).toHaveTextContent('Alpha');

    fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
    expect(onClick).toHaveBeenCalledWith(alpha);
  });

  it('data entry exposes the 81 valid built-in cities', () => {
    expect(cities).toHaveLength(81);
    expect(new Set(cities.map((city) => city.id)).size).toBe(81);
    expect(cities.map((city) => city.plateNumber).sort((first, second) => first - second))
      .toEqual(Array.from({ length: 81 }, (_, index) => index + 1));

    for (const city of cities) {
      expect(city.name.trim()).not.toBe('');
      expect(city.path.trim()).toMatch(/^M\s/);
    }
  });
});
