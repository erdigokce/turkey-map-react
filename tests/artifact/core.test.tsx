import React from 'react';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import '@testing-library/jest-dom';

const coreBundle = require('../../lib/core.js');
const CoreTurkeyMap = (coreBundle.default || coreBundle) as React.ComponentType<{
  data?: {
    cities: Array<{
      id: string;
      plateNumber: number;
      name: string;
      path: string;
    }>;
  };
  showTooltip?: boolean;
  tooltipText?: string;
  customStyle?: { idleColor: string; hoverColor: string };
}>;

const customCities = [
  { id: 'alpha', plateNumber: 1, name: 'Alpha', path: 'M 0 0 L 10 10 L 0 10 Z' },
  { id: 'beta', plateNumber: 2, name: 'Beta', path: 'M 20 20 L 30 30 L 20 30 Z' },
];

const getCityGroups = (container: HTMLElement) => (
  Array.from(container.querySelectorAll('g[data-iladi]'))
);

describe('published core bundle', () => {
  it('exports a renderable component', () => {
    expect(typeof CoreTurkeyMap).toBe('function');

    const { container } = render(
      <CoreTurkeyMap data={{ cities: customCities }} />,
    );

    expect(container.querySelector('#svg-turkiye-haritasi')).toBeInTheDocument();
    expect(getCityGroups(container)).toHaveLength(2);
  });

  it('renders no provinces when runtime data is omitted', () => {
    const { container } = render(<CoreTurkeyMap />);

    expect(getCityGroups(container)).toHaveLength(0);
  });

  it('supports tooltip and custom colors', () => {
    const { container } = render(
      <CoreTurkeyMap
        data={{ cities: customCities }}
        showTooltip={true}
        tooltipText="Core tooltip"
        customStyle={{ idleColor: '#123456', hoverColor: '#abcdef' }}
      />,
    );
    const path = container.querySelector('g[data-iladi] path');

    expect(path).toHaveStyle({ fill: '#123456' });
    expect(container.querySelector('#svg-turkiye-haritasi-container-tooltip'))
      .toHaveTextContent('Core tooltip');
  });

  it('renders custom data to static markup', () => {
    const html = renderToStaticMarkup(
      <CoreTurkeyMap data={{ cities: customCities }} />,
    );

    expect(html).toContain('id="svg-turkiye-haritasi"');
    expect(html.match(/data-iladi=/g)).toHaveLength(2);
  });
});
