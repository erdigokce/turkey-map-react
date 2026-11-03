import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import '@testing-library/jest-dom';

const bundle = require('../../lib/index.js');
const TurkeyMap = (bundle.default || bundle) as React.ComponentType<{
  visible?: boolean;
  showTooltip?: boolean;
  tooltipText?: string;
  renderTooltip?: (city: { id: string; name: string }, value?: unknown) => React.ReactNode;
  tooltipPosition?: 'cursor' | 'city';
  tooltipPortal?: boolean;
  tooltipOffset?: number;
  tooltipDelay?: number;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
  svgProps?: React.SVGAttributes<SVGSVGElement>;
  customStyle?: {
    idleColor: string;
    hoverColor: string;
    strokeColor?: string;
    strokeWidth?: number;
  };
  getCityStyle?: (
    city: { id: string },
    state: { hovered: boolean; selected: boolean; disabled: boolean; focused: boolean },
  ) => React.CSSProperties | undefined;
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

  it('renders a custom tooltip from the built bundle', () => {
    const renderTooltip = jest.fn(
      (city: { name: string }) => <strong>Built {city.name} card</strong>,
    );
    const { container } = render(
      <TurkeyMap showTooltip={true} renderTooltip={renderTooltip} />,
    );
    const tooltip = container.querySelector('#svg-turkiye-haritasi-container-tooltip');
    const group = container.querySelector('g[data-iladi]');

    if (!group || !tooltip) {
      throw new Error('Expected a city group and a tooltip');
    }

    fireEvent.mouseEnter(group);

    expect(renderTooltip).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) }),
      undefined,
    );
    expect(tooltip.querySelector('strong')).toHaveTextContent(/Built .+ card/);
  });

  it('renders a portaled tooltip from the built bundle', () => {
    const { unmount } = render(
      <TurkeyMap showTooltip={true} tooltipPortal={true} />,
    );
    const tooltip = document.getElementById('svg-turkiye-haritasi-container-tooltip');

    expect(tooltip).toBeInTheDocument();
    expect(tooltip?.parentElement).toBe(document.body);

    unmount();

    expect(document.getElementById('svg-turkiye-haritasi-container-tooltip')).toBeNull();
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

  it('applies theming props and scoped ids from the built bundle', () => {
    const { container } = render(
      <TurkeyMap
        id="artifact-map"
        className="artifact-map"
        showTooltip={true}
        containerProps={{ 'data-testid': 'artifact-shell' }}
        svgProps={{ 'aria-label': 'Artifact map' }}
        customStyle={{
          idleColor: '#444',
          hoverColor: '#dc3522',
          strokeColor: '#ffffff',
          strokeWidth: 1,
        }}
        getCityStyle={(city) => (city.id === 'istanbul' ? { fill: '#123456' } : undefined)}
      />,
    );
    const svg = container.querySelector('#artifact-map-svg');

    expect(container.querySelector('#artifact-map')).toHaveAttribute(
      'data-testid',
      'artifact-shell',
    );
    expect(container.querySelector('#artifact-map')).toHaveClass('artifact-map');
    expect(svg).toHaveAttribute('aria-label', 'Artifact map');
    expect(container.querySelector('#artifact-map-turkiye')).toBeInTheDocument();
    expect(container.querySelector('#artifact-map-tooltip')).toBeInTheDocument();
    expect(container.querySelector('#istanbul path')).toHaveStyle({ fill: '#123456' });
  });
});
