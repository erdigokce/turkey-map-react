import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap, { CityType } from '../index';
import { testData } from '../../tests/fixtures/cities';
import { getCityGroup, getCityPath, getTooltip } from '../../tests/helpers';

describe('TurkeyMap edge cases', () => {
  it('handles a wrapped city without a path element', () => {
    const cityWrapper = (cityComponent: React.ReactElement) => (
      React.cloneElement(cityComponent, {}, null)
    );
    const { container } = render(
      <TurkeyMap data={testData} cityWrapper={cityWrapper} showTooltip={true} />,
    );
    const group = getCityGroup(container, 'Alpha');

    expect(group.querySelector('path')).toBeNull();
    expect(() => {
      fireEvent.mouseEnter(group);
      fireEvent.mouseLeave(group);
    }).not.toThrow();

    expect(getTooltip(container)).toBeInTheDocument();
  });

  it('falls back to safe values when city attributes are missing', () => {
    const onClick = jest.fn();
    const cityWrapper = (cityComponent: React.ReactElement) => React.cloneElement(
      cityComponent,
      {
        id: undefined,
        'data-iladi': undefined,
        'data-plakakodu': undefined,
      },
    );
    const { container } = render(
      <TurkeyMap data={testData} cityWrapper={cityWrapper} onClick={onClick} />,
    );
    const path = container.querySelector('path');
    if (!path) {
      throw new Error('Expected a city path');
    }

    fireEvent.click(path);

    expect(onClick).toHaveBeenCalledWith({
      id: '',
      name: '',
      plateNumber: 0,
      path: 'M 0 0 L 10 10 L 0 10 Z',
    });
  });

  it('falls back to an empty path when the path has no d attribute', () => {
    const onClick = jest.fn();
    const cityWrapper = (cityComponent: React.ReactElement) => React.cloneElement(
      cityComponent,
      {},
      <path />,
    );
    const { container } = render(
      <TurkeyMap data={testData} cityWrapper={cityWrapper} onClick={onClick} />,
    );
    const path = container.querySelector('path');
    if (!path) {
      throw new Error('Expected a city path');
    }

    fireEvent.click(path);

    expect(onClick).toHaveBeenCalledWith({
      id: 'alpha',
      name: 'Alpha',
      plateNumber: 1,
      path: '',
    });
  });

  it('renders city names and ids with special characters', () => {
    const city: CityType = {
      id: 'agri-ozel',
      plateNumber: 4,
      name: 'Ağrı "Özel" <Test>',
      path: 'M 1 2 L 3 4 Z',
    };
    const { container } = render(<TurkeyMap data={{ cities: [city] }} />);
    const group = getCityGroup(container, city.name);

    expect(group).toHaveAttribute('id', city.id);
    expect(group).toHaveAttribute('data-plakakodu', '4');
    expect(getCityPath(group)).toHaveAttribute('d', city.path);
  });

  it('does not throw when unmounted', () => {
    const { unmount } = render(<TurkeyMap data={testData} showTooltip={true} />);

    expect(() => unmount()).not.toThrow();
  });

  it('supports interactions inside React.StrictMode', () => {
    const onClick = jest.fn();
    const { container } = render(
      <React.StrictMode>
        <TurkeyMap data={testData} onClick={onClick} />
      </React.StrictMode>,
    );

    fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
