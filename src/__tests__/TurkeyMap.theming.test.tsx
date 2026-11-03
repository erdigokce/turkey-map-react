import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import '@testing-library/jest-dom';
import TurkeyMap, {
  CityInteractionState,
  CityStyleGetter,
} from '../index';
import { alpha, beta, testData } from '../../tests/fixtures/cities';
import {
  getCityGroup,
  getCityPath,
  getMapContainer,
  getSvg,
} from '../../tests/helpers';
import { installMatchMedia } from '../../tests/tooltip-helpers';

const generalStroke = 'var(--tm-stroke-color, none)';
const generalStrokeWidth = 'var(--tm-stroke-width, 0.5)';

const getUserCssVar = (element: HTMLElement, name: string): string => (
  element.style.getPropertyValue(name)
);

describe('TurkeyMap theming', () => {
  describe('container customization', () => {
    it('applies className and style while keeping the default container styles', () => {
      const { container } = render(
        <TurkeyMap className="my-map" style={{ maxWidth: 800 }} />,
      );
      const mapContainer = getMapContainer(container);

      expect(mapContainer).toHaveClass('my-map');
      expect(mapContainer).toHaveStyle({
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center',
      });
    });

    it('applies arbitrary containerProps attributes', () => {
      const { container } = render(
        <TurkeyMap containerProps={{ 'data-testid': 'map-shell', dir: 'ltr' }} />,
      );
      const mapContainer = getMapContainer(container);

      expect(mapContainer).toHaveAttribute('data-testid', 'map-shell');
      expect(mapContainer).toHaveAttribute('dir', 'ltr');
    });

    it('lets explicit props win over containerProps while joining class names', () => {
      const { container } = render(
        <TurkeyMap
          id="explicit"
          className="explicit"
          style={{ maxWidth: 700 }}
          containerProps={{
            id: 'from-container',
            className: 'from-container',
            style: { maxWidth: 500, color: 'red' },
          }}
        />,
      );
      const mapContainer = container.firstElementChild as HTMLElement;

      expect(mapContainer).toHaveAttribute('id', 'explicit');
      expect(mapContainer).toHaveClass('from-container', 'explicit');
      expect(mapContainer).toHaveStyle({ maxWidth: '700px' });
      expect(mapContainer.style.color).toBe('red');
    });

    it('ignores containerProps.children', () => {
      const { container } = render(
        <TurkeyMap
          containerProps={{
            children: <span data-testid="injected-child">Injected</span>,
          }}
        />,
      );

      expect(container.querySelector('[data-testid="injected-child"]')).toBeNull();
      expect(getSvg(container)).toBeInTheDocument();
    });

    it('keeps visible authoritative over containerProps.hidden', () => {
      const { container } = render(
        <TurkeyMap containerProps={{ hidden: true }} />,
      );

      expect(getMapContainer(container)).not.toHaveAttribute('hidden');
    });
  });

  describe('SVG customization', () => {
    it('applies accessible and arbitrary svgProps attributes', () => {
      const { container } = render(
        <TurkeyMap
          svgProps={{
            'aria-label': 'Turkey provinces',
            role: 'img',
            'data-testid': 'map-svg',
          }}
        />,
      );
      const svg = getSvg(container);

      expect(svg).toHaveAttribute('aria-label', 'Turkey provinces');
      expect(svg).toHaveAttribute('role', 'img');
      expect(svg).toHaveAttribute('data-testid', 'map-svg');
    });

    it('merges svgProps className and style with the base SVG attributes', () => {
      const { container } = render(
        <TurkeyMap
          svgProps={{
            className: 'custom-svg',
            style: { width: 50, height: 20, color: 'red' },
          }}
        />,
      );
      const svg = getSvg(container);

      expect(svg).toHaveClass('custom-svg');
      expect(svg).toHaveStyle({ width: '50px', height: '20px' });
      expect(svg.style.color).toBe('red');
    });

    it('keeps the controlled id, viewBox, version, and namespaces authoritative', () => {
      const { container } = render(
        <TurkeyMap
          viewBox={{ top: 0, left: 0, width: 100, height: 100 }}
          svgProps={{
            id: 'consumer-svg',
            viewBox: '0 0 1 1',
            version: '2',
            xmlns: 'https://example.com/not-svg',
          }}
        />,
      );
      const svg = getSvg(container);

      expect(svg).toHaveAttribute('id', 'svg-turkiye-haritasi');
      expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
      expect(svg).toHaveAttribute('version', '1.1');
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
    });

    it('keeps the base SVG size when svgProps does not override it', () => {
      const { container } = render(<TurkeyMap />);

      expect(getSvg(container)).toHaveStyle({ width: '100%', height: 'auto' });
    });
  });

  describe('instance-scoped ids', () => {
    it('derives all component ids from a custom id', () => {
      const { container } = render(
        <TurkeyMap id="checkout-map" data={testData} showTooltip={true} />,
      );

      expect(container.querySelector('#checkout-map')).toBeInTheDocument();
      expect(container.querySelector('#checkout-map-svg')).toBeInTheDocument();
      expect(container.querySelector('#checkout-map-tooltip')).toBeInTheDocument();
      expect(container.querySelector('#checkout-map-turkiye')).toBeInTheDocument();
    });

    it('keeps the legacy ids when id is omitted', () => {
      const { container } = render(<TurkeyMap showTooltip={true} />);

      expect(container.querySelector('#svg-turkiye-haritasi-container')).toBeInTheDocument();
      expect(container.querySelector('#svg-turkiye-haritasi')).toBeInTheDocument();
      expect(container.querySelector('#svg-turkiye-haritasi-container-tooltip'))
        .toBeInTheDocument();
      expect(container.querySelector('#turkiye')).toBeInTheDocument();
    });

    it('treats empty and whitespace ids as omitted', () => {
      const { container, rerender } = render(<TurkeyMap id="" />);

      expect(container.querySelector('#svg-turkiye-haritasi-container')).toBeInTheDocument();

      rerender(<TurkeyMap id="   " />);

      expect(container.querySelector('#svg-turkiye-haritasi-container')).toBeInTheDocument();
      expect(container.querySelector('#svg-turkiye-haritasi')).toBeInTheDocument();
      expect(container.querySelector('#turkiye')).toBeInTheDocument();
    });

    it('gives two instances distinct component ids', () => {
      const { container } = render(
        <>
          <TurkeyMap id="map-a" data={testData} showTooltip={true} />
          <TurkeyMap id="map-b" data={testData} showTooltip={true} />
        </>,
      );

      expect(container.querySelectorAll('#map-a')).toHaveLength(1);
      expect(container.querySelectorAll('#map-a-svg')).toHaveLength(1);
      expect(container.querySelectorAll('#map-a-tooltip')).toHaveLength(1);
      expect(container.querySelectorAll('#map-a-turkiye')).toHaveLength(1);
      expect(container.querySelectorAll('#map-b')).toHaveLength(1);
      expect(container.querySelectorAll('#map-b-svg')).toHaveLength(1);
      expect(container.querySelectorAll('#map-b-tooltip')).toHaveLength(1);
      expect(container.querySelectorAll('#map-b-turkiye')).toHaveLength(1);
    });

    it('does not prefix province ids with the instance id', () => {
      const { container } = render(
        <TurkeyMap id="checkout-map" data={testData} />,
      );

      expect(container.querySelector('g#alpha')).toBeInTheDocument();
      expect(container.querySelector('g#beta')).toBeInTheDocument();
      expect(container.querySelector('#checkout-map-alpha')).toBeNull();
    });
  });

  describe('CSS custom properties', () => {
    it('references the documented CSS variables with their defaults', () => {
      const { container } = render(<TurkeyMap data={testData} />);
      const path = getCityPath(getCityGroup(container, 'Alpha'));

      expect(path.style.fill).toBe('var(--tm-idle-color, #444)');
      expect(path.style.stroke).toBe(generalStroke);
      expect(path.style.strokeWidth).toBe(generalStrokeWidth);
    });

    it('references the hover, selected, and disabled variables for their states', () => {
      const hovered = render(<TurkeyMap data={testData} />);
      const hoveredGroup = getCityGroup(hovered.container, 'Alpha');

      fireEvent.mouseEnter(hoveredGroup);
      expect(getCityPath(hoveredGroup).style.fill).toBe('var(--tm-hover-color, #dc3522)');

      const selected = render(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          selectedCity={alpha.id}
        />,
      );
      expect(getCityPath(getCityGroup(selected.container, 'Alpha')).style.fill)
        .toBe('var(--tm-selected-color, #dc3522)');

      const disabled = render(
        <TurkeyMap data={testData} disabledCities={[alpha.id]} />,
      );
      expect(getCityPath(getCityGroup(disabled.container, 'Alpha')).style.fill)
        .toBe('var(--tm-disabled-color, #e5e5e5)');
    });

    it('lets literal customStyle values override CSS variables', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          customStyle={{ idleColor: '#123456', hoverColor: '#654321' }}
        />,
      );
      const group = getCityGroup(container, 'Alpha');

      expect(getCityPath(group)).toHaveStyle({ fill: '#123456' });

      fireEvent.mouseEnter(group);
      expect(getCityPath(group)).toHaveStyle({ fill: '#654321' });
    });

    it('supports per-instance CSS variable values on each container', () => {
      const { container } = render(
        <>
          <TurkeyMap
            id="map-a"
            data={testData}
            style={{ '--tm-idle-color': '#eeeeee' } as React.CSSProperties}
          />
          <TurkeyMap
            id="map-b"
            data={testData}
            style={{ '--tm-idle-color': '#dddddd' } as React.CSSProperties}
          />
        </>,
      );
      const mapA = container.querySelector('#map-a') as HTMLElement;
      const mapB = container.querySelector('#map-b') as HTMLElement;

      expect(getUserCssVar(mapA, '--tm-idle-color')).toBe('#eeeeee');
      expect(getUserCssVar(mapB, '--tm-idle-color')).toBe('#dddddd');
      expect(mapA.querySelector('g[data-iladi="Alpha"] path')?.getAttribute('style'))
        .toContain('fill: var(--tm-idle-color, #444)');
      expect(mapB.querySelector('g[data-iladi="Alpha"] path')?.getAttribute('style'))
        .toContain('fill: var(--tm-idle-color, #444)');
    });

    it('uses the focus-ring variable with its default offset', () => {
      const { container } = render(
        <TurkeyMap data={testData} selectionMode="single" />,
      );
      const group = getCityGroup(container, 'Alpha');

      fireEvent.focus(group);

      expect(group.style.outline).toBe('2px solid #1a73e8');
      expect(group.style.outlineColor).toBe('var(--tm-focus-ring, #1a73e8)');
      expect(group.style.outlineOffset).toBe('2px');
    });
  });

  describe('getCityStyle', () => {
    it('styles the selected province and falls back for the rest', () => {
      const getCityStyle: CityStyleGetter = (city, state) => (
        state.selected ? { fill: '#dc3522' } : undefined
      );
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          selectedCity={alpha.id}
          getCityStyle={getCityStyle}
        />,
      );

      expect(getCityPath(getCityGroup(container, 'Alpha')).style.fill).toBe('#dc3522');
      expect(getCityPath(getCityGroup(container, 'Beta')).style.fill)
        .toBe('var(--tm-idle-color, #444)');
    });

    it('receives selected and disabled state for every province', () => {
      const states = new Map<string, CityInteractionState>();
      const getCityStyle: CityStyleGetter = (city, state) => {
        states.set(city.id, state);
        return undefined;
      };

      render(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          selectedCity={alpha.id}
          disabledCities={[beta.id]}
          getCityStyle={getCityStyle}
        />,
      );

      expect(states.get(alpha.id)).toEqual({
        hovered: false,
        selected: true,
        disabled: false,
        focused: false,
      });
      expect(states.get(beta.id)).toEqual({
        hovered: false,
        selected: false,
        disabled: true,
        focused: false,
      });
    });

    it('receives hover and focus state after interaction', () => {
      const states: Record<string, CityInteractionState> = {};
      const getCityStyle: CityStyleGetter = (city, state) => {
        states[city.id] = state;
        return undefined;
      };
      const { container } = render(
        <TurkeyMap data={testData} selectionMode="single" getCityStyle={getCityStyle} />,
      );
      const group = getCityGroup(container, 'Alpha');

      fireEvent.mouseEnter(group);
      fireEvent.focus(group);

      expect(states.alpha).toEqual({
        hovered: true,
        selected: false,
        disabled: false,
        focused: true,
      });
    });

    it('overrides customStyle for the properties it returns', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          customStyle={{ idleColor: '#444444', hoverColor: '#dc3522' }}
          getCityStyle={() => ({ fill: '#111111' })}
        />,
      );

      expect(getCityPath(getCityGroup(container, 'Alpha')).style.fill).toBe('#111111');
    });

    it('ignores undefined properties and keeps the resolved style', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          customStyle={{ idleColor: '#123456', hoverColor: '#654321' }}
          getCityStyle={() => ({ strokeWidth: 3, fill: undefined })}
        />,
      );
      const path = getCityPath(getCityGroup(container, 'Alpha'));

      expect(path).toHaveStyle({ fill: '#123456', strokeWidth: 3 });
    });

    it('can affect any inline path property', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          getCityStyle={() => ({ opacity: 0.5, cursor: 'crosshair' })}
        />,
      );

      expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveStyle({
        opacity: '0.5',
        cursor: 'crosshair',
      });
    });

    it('evaluates per province and re-evaluates after interaction', () => {
      const getCityStyle = jest.fn((city, state: CityInteractionState) => ({
        fill: state.hovered
          ? '#ff0000'
          : city.id === alpha.id
            ? '#aaaaaa'
            : '#bbbbbb',
      }));
      const { container } = render(
        <TurkeyMap data={testData} getCityStyle={getCityStyle} />,
      );
      const alphaGroup = getCityGroup(container, 'Alpha');
      const betaPath = getCityPath(getCityGroup(container, 'Beta'));

      expect(getCityPath(alphaGroup).style.fill).toBe('#aaaaaa');
      expect(betaPath.style.fill).toBe('#bbbbbb');

      fireEvent.mouseEnter(alphaGroup);
      expect(getCityPath(alphaGroup).style.fill).toBe('#ff0000');
      expect(betaPath.style.fill).toBe('#bbbbbb');

      fireEvent.mouseLeave(alphaGroup);
      expect(getCityPath(alphaGroup).style.fill).toBe('#aaaaaa');
    });

    it('leaves the resolved style unchanged for undefined or empty results', () => {
      const { container, rerender } = render(
        <TurkeyMap data={testData} getCityStyle={() => undefined} />,
      );

      expect(getCityPath(getCityGroup(container, 'Alpha')).style.fill)
        .toBe('var(--tm-idle-color, #444)');

      rerender(<TurkeyMap data={testData} getCityStyle={() => ({})} />);
      expect(getCityPath(getCityGroup(container, 'Alpha')).style.fill)
        .toBe('var(--tm-idle-color, #444)');
    });
  });

  describe('stroke styling', () => {
    it('applies customStyle strokeColor and strokeWidth to non-selected paths', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          customStyle={{
            idleColor: '#444',
            hoverColor: '#dc3522',
            strokeColor: '#ffffff',
            strokeWidth: 1,
          }}
        />,
      );

      expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveStyle({
        stroke: '#ffffff',
        strokeWidth: 1,
      });
    });

    it('keeps selectedStroke and selectedStrokeWidth authoritative', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          selectedCities={[alpha.id]}
          customStyle={{
            idleColor: '#444',
            hoverColor: '#dc3522',
            strokeColor: '#ffffff',
            strokeWidth: 1,
            selectedStroke: '#444444',
            selectedStrokeWidth: 4,
          }}
        />,
      );

      expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveStyle({
        stroke: '#444444',
        strokeWidth: 4,
      });
      expect(getCityPath(getCityGroup(container, 'Beta'))).toHaveStyle({
        stroke: '#ffffff',
        strokeWidth: 1,
      });
    });

    it('adds no visible outline by default', () => {
      const { container } = render(<TurkeyMap data={testData} />);

      expect(getCityPath(getCityGroup(container, 'Alpha')).style.stroke)
        .toBe(generalStroke);
    });
  });

  describe('tooltip animation names', () => {
    it('uses the derived tooltip id and animation name', () => {
      const matchMedia = installMatchMedia(false);
      const { container } = render(
        <TurkeyMap id="checkout-map" data={testData} showTooltip={true} tooltipDelay={0} />,
      );
      const group = getCityGroup(container, 'Alpha');
      const tooltip = container.querySelector('#checkout-map-tooltip') as HTMLElement;

      try {
        fireEvent.mouseEnter(group);
        fireEvent.mouseLeave(group);

        expect(tooltip.style.animation).toContain('tm-checkout-map-tooltip-fade-out');
        expect(container.querySelector('style'))
          .toHaveTextContent('@keyframes tm-checkout-map-tooltip-fade-out');
      } finally {
        matchMedia.restore();
      }
    });

    it('sanitizes the id used in the animation name', () => {
      const { container } = render(
        <TurkeyMap id="map.1" data={testData} showTooltip={true} />,
      );
      const group = getCityGroup(container, 'Alpha');

      fireEvent.mouseEnter(group);
      fireEvent.mouseLeave(group);

      expect(container.querySelector('[id="map.1-tooltip"]')).toBeInTheDocument();
      expect(container.querySelector('style'))
        .toHaveTextContent('@keyframes tm-map-1-tooltip-fade-out');
    });

    it('keeps the legacy animation name when id is omitted', () => {
      const matchMedia = installMatchMedia(false);
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipDelay={0} />,
      );
      const group = getCityGroup(container, 'Alpha');
      const tooltip = container.querySelector('#svg-turkiye-haritasi-container-tooltip');

      try {
        fireEvent.mouseEnter(group);
        fireEvent.mouseLeave(group);

        expect((tooltip as HTMLElement).style.animation)
          .toContain('turkey_react_map_tooltip_fade_out');
        expect(container.querySelector('style'))
          .toHaveTextContent('@keyframes turkey_react_map_tooltip_fade_out');
      } finally {
        matchMedia.restore();
      }
    });

    it('gives two instances distinct animation names', () => {
      const { container } = render(
        <>
          <TurkeyMap id="map-a" data={testData} showTooltip={true} />
          <TurkeyMap id="map-b" data={testData} showTooltip={true} />
        </>,
      );
      const styles = Array.from(container.querySelectorAll('style'))
        .map((style) => style.textContent ?? '');

      expect(styles[0]).toContain('@keyframes tm-map-a-tooltip-fade-out');
      expect(styles[1]).toContain('@keyframes tm-map-b-tooltip-fade-out');
    });
  });

  describe('server rendering', () => {
    it('renders theming props and scoped ids to static markup', () => {
      const html = renderToStaticMarkup(
        <TurkeyMap
          id="checkout-map"
          data={testData}
          showTooltip={true}
          svgProps={{ 'aria-label': 'Turkey provinces', role: 'img' }}
          style={{ '--tm-idle-color': '#eeeeee' } as React.CSSProperties}
          getCityStyle={({ id: cityId }) => (
            cityId === alpha.id ? { fill: '#123456' } : undefined
          )}
        />,
      );

      expect(html).toContain('id="checkout-map"');
      expect(html).toContain('id="checkout-map-svg"');
      expect(html).toContain('id="checkout-map-tooltip"');
      expect(html).toContain('id="checkout-map-turkiye"');
      expect(html).toContain('aria-label="Turkey provinces"');
      expect(html).toContain('role="img"');
      expect(html).toContain('--tm-idle-color:#eeeeee');
      expect(html).toContain('fill:#123456');
    });
  });
});
