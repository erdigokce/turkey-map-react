import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import '@testing-library/jest-dom';

const bundle = require('../../lib/index.js');
const TurkeyMap = (bundle.default || bundle) as React.ComponentType<{
  visible?: boolean;
  showTooltip?: boolean;
  tooltipText?: string;
  customStyle?: { idleColor: string; hoverColor: string };
  onClick?: (city: unknown) => void;
}>;

const getCityGroups = (container: HTMLElement) => (
  Array.from(container.querySelectorAll('g[data-iladi]'))
);

describe('published bundle', () => {
  it('exports a renderable component', () => {
    expect(typeof TurkeyMap).toBe('function');

    const { container } = render(<TurkeyMap />);

    expect(container.querySelector('#svg-turkiye-haritasi')).toBeInTheDocument();
    expect(getCityGroups(container)).toHaveLength(81);
  });

  it('renders the tooltip from the built bundle', () => {
    const { container } = render(
      <TurkeyMap showTooltip={true} tooltipText="Built bundle tooltip" />,
    );

    expect(
      container.querySelector('#svg-turkiye-haritasi-container-tooltip'),
    ).toHaveTextContent('Built bundle tooltip');
  });

  it('honors the visible prop from the built bundle', () => {
    const { container } = render(<TurkeyMap visible={false} />);

    expect(
      container.querySelector('#svg-turkiye-haritasi-container'),
    ).toHaveAttribute('hidden');
  });

  it('dispatches click events from the built bundle', () => {
    const onClick = jest.fn();
    const { container } = render(<TurkeyMap onClick={onClick} />);
    const path = container.querySelector('g[data-iladi] path');
    if (!path) {
      throw new Error('Expected a city path');
    }

    fireEvent.click(path);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders to static markup from the built bundle', () => {
    const html = renderToStaticMarkup(<TurkeyMap />);

    expect(html).toContain('id="svg-turkiye-haritasi"');
    expect(html.match(/data-iladi=/g)).toHaveLength(81);
  });

  it('applies custom colors from the built bundle', () => {
    const { container } = render(
      <TurkeyMap customStyle={{ idleColor: '#123456', hoverColor: '#abcdef' }} />,
    );
    const path = container.querySelector('g[data-iladi] path');
    if (!path) {
      throw new Error('Expected a city path');
    }

    expect(path).toHaveStyle({ fill: '#123456' });
  });
});
