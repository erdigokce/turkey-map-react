import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const bundle = require('../../lib/index.js');
const coreBundle = require('../../lib/core.js');

const useTurkeyMap = bundle.useTurkeyMap as typeof import('../../src/useTurkeyMap').default;
const coreUseTurkeyMap = coreBundle.useTurkeyMap as typeof import('../../src/useTurkeyMap').default;

const cities = [
  { id: 'alpha', plateNumber: 1, name: 'Alpha', path: 'M 0 0 L 10 10 L 0 10 Z' },
  { id: 'beta', plateNumber: 2, name: 'Beta', path: 'M 20 20 L 30 30 L 20 30 Z' },
];
const data = { cities };

const RootHeadless = () => {
  const {
    getContainerProps,
    getCityProps,
    getTooltipProps,
    selectedCities,
  } = useTurkeyMap({ data, selectionMode: 'multiple', showTooltip: true });

  return (
    <div>
      <div data-testid="artifact-root-container" {...getContainerProps()}>
        {cities.map((city) => (
          <div key={city.id} data-testid={`artifact-root-${city.id}`} {...getCityProps(city)}>
            {city.name}
          </div>
        ))}
      </div>
      <div {...getTooltipProps()} />
      <div data-testid="artifact-root-selected">{selectedCities.map((city) => city.id).join(',')}</div>
    </div>
  );
};

const CoreHeadless = () => {
  const { getContainerProps, getCityProps, selectedIds } = coreUseTurkeyMap({
    data,
    selectionMode: 'single',
  });

  return (
    <div>
      <div data-testid="artifact-core-container" {...getContainerProps()}>
        {cities.map((city) => (
          <div key={city.id} data-testid={`artifact-core-${city.id}`} {...getCityProps(city)}>
            {city.name}
          </div>
        ))}
      </div>
      <div data-testid="artifact-core-selected">{selectedIds.join(',')}</div>
    </div>
  );
};

describe('published headless hook', () => {
  it('exports the hook from both built entries', () => {
    expect(typeof useTurkeyMap).toBe('function');
    expect(typeof coreUseTurkeyMap).toBe('function');
  });

  it('renders headless markup from the root bundle', () => {
    render(<RootHeadless />);

    expect(screen.getByTestId('artifact-root-container')).toHaveAttribute('role', 'listbox');
    expect(screen.getByTestId('artifact-root-alpha')).toHaveAttribute('role', 'option');
    fireEvent.click(screen.getByTestId('artifact-root-alpha'));
    expect(screen.getByTestId('artifact-root-selected')).toHaveTextContent('alpha');
  });

  it('renders headless markup from the core bundle', () => {
    render(<CoreHeadless />);

    expect(screen.getByTestId('artifact-core-container')).toHaveAttribute('role', 'listbox');
    expect(screen.getByTestId('artifact-core-alpha')).toHaveAttribute('aria-label', 'Alpha, plate 1');
    fireEvent.click(screen.getByTestId('artifact-core-alpha'));
    expect(screen.getByTestId('artifact-core-selected')).toHaveTextContent('alpha');
  });
});
