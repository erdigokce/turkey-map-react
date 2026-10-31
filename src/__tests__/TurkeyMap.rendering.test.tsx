import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap, { CityType } from '../index';
import { alpha, beta, testCities, testData } from '../../tests/fixtures/cities';
import {
  getCityGroup,
  getCityGroups,
  getCityPath,
  getMapContainer,
  getSvg,
} from '../../tests/helpers';

describe('TurkeyMap rendering', () => {
  it('renders the default map', () => {
    const { container } = render(<TurkeyMap />);
    const svg = getSvg(container);

    expect(svg).toHaveAttribute('viewBox', '0 80 1050 585');
    expect(container.querySelector('g#turkiye')).toBeInTheDocument();
    expect(getCityGroups(container)).toHaveLength(81);
    expect(getMapContainer(container)).not.toHaveAttribute('hidden');

    const bursa = getCityGroup(container, 'Bursa');
    expect(bursa).toHaveAttribute('id', 'bursa');
    expect(bursa).toHaveAttribute('data-plakakodu', '16');

    const path = getCityPath(bursa);
    expect(path).toHaveAttribute('d');
    expect(path.getAttribute('d')).not.toBe('');
    expect(path).toHaveStyle({ fill: '#444', cursor: 'pointer' });
  });

  it('renders a custom viewBox', () => {
    const { container } = render(
      <TurkeyMap viewBox={{ top: 10, left: 20, width: 800, height: 600 }} />,
    );

    expect(getSvg(container)).toHaveAttribute('viewBox', '10 20 800 600');
  });

  it('hides and shows the map with the visible prop', () => {
    const { container, rerender } = render(<TurkeyMap visible={false} />);

    expect(getMapContainer(container)).toHaveAttribute('hidden');

    rerender(<TurkeyMap visible={true} />);
    expect(getMapContainer(container)).not.toHaveAttribute('hidden');
  });

  it('applies the idle color to every city path', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        customStyle={{ idleColor: '#ff0000', hoverColor: '#00ff00' }}
      />,
    );

    for (const group of getCityGroups(container)) {
      expect(getCityPath(group)).toHaveStyle({ fill: '#ff0000' });
    }
  });

  it('updates path colors when customStyle changes', () => {
    const { container, rerender } = render(
      <TurkeyMap
        data={testData}
        customStyle={{ idleColor: '#111111', hoverColor: '#222222' }}
      />,
    );
    const path = getCityPath(getCityGroup(container, 'Alpha'));

    expect(path).toHaveStyle({ fill: '#111111' });

    rerender(
      <TurkeyMap
        data={testData}
        customStyle={{ idleColor: '#333333', hoverColor: '#444444' }}
      />,
    );

    expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveStyle({
      fill: '#333333',
    });
  });

  it('renders custom city data', () => {
    const { container } = render(<TurkeyMap data={testData} />);

    expect(getCityGroups(container)).toHaveLength(2);

    const alphaGroup = getCityGroup(container, 'Alpha');
    expect(alphaGroup).toHaveAttribute('id', 'alpha');
    expect(alphaGroup).toHaveAttribute('data-plakakodu', '1');
    expect(getCityPath(alphaGroup)).toHaveAttribute('d', alpha.path);

    const betaGroup = getCityGroup(container, 'Beta');
    expect(betaGroup).toHaveAttribute('id', 'beta');
    expect(betaGroup).toHaveAttribute('data-plakakodu', '2');
    expect(getCityPath(betaGroup)).toHaveAttribute('d', beta.path);
  });

  it('renders an empty map when there are no cities', () => {
    const { container } = render(<TurkeyMap data={{ cities: [] }} />);

    expect(getSvg(container)).toBeInTheDocument();
    expect(getCityGroups(container)).toHaveLength(0);
  });

  it('replaces rendered cities when the data prop changes', () => {
    const { container, rerender } = render(<TurkeyMap data={testData} />);

    expect(getCityGroups(container)).toHaveLength(2);

    rerender(<TurkeyMap data={{ cities: [beta] }} />);

    expect(getCityGroups(container)).toHaveLength(1);
    expect(getCityGroup(container, 'Beta')).toBeInTheDocument();
    expect(container.querySelector('g[data-iladi="Alpha"]')).toBeNull();
  });

  it('passes every city and its element to cityWrapper', () => {
    const cityWrapper = jest.fn(
      (cityComponent: React.ReactElement, city: CityType) => React.cloneElement(
        cityComponent,
        { 'data-testid': `wrapped-${city.id}` },
      ),
    );

    const { container } = render(
      <TurkeyMap data={testData} cityWrapper={cityWrapper} />,
    );

    expect(cityWrapper).toHaveBeenCalledTimes(testCities.length);
    expect(cityWrapper.mock.calls[0][1]).toEqual(alpha);
    expect(cityWrapper.mock.calls[1][1]).toEqual(beta);
    expect(container.querySelectorAll('[data-testid^="wrapped-"]')).toHaveLength(2);
    expect(container.querySelector('[data-testid="wrapped-alpha"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="wrapped-beta"]')).toBeInTheDocument();
  });

  it('renders and remains usable inside React.StrictMode', () => {
    const { container } = render(
      <React.StrictMode>
        <TurkeyMap data={testData} />
      </React.StrictMode>,
    );

    expect(getCityGroups(container)).toHaveLength(2);
  });

  it('keeps the generated SVG structure stable for a small data set', () => {
    const { container } = render(<TurkeyMap data={testData} />);

    expect(getSvg(container).outerHTML).toMatchSnapshot();
  });
});
