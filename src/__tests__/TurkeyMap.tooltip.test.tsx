import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import {
  alpha,
  beta,
  customDisabledData,
  testData,
  testCities,
} from '../../tests/fixtures/cities';
import { getCityGroup, getCityPath, getTooltip } from '../../tests/helpers';
import {
  advanceTimers,
  installMatchMedia,
  mockCityBounds,
} from '../../tests/tooltip-helpers';

describe('TurkeyMap tooltip', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not render the tooltip or keyframes when showTooltip is false', () => {
    const { container } = render(<TurkeyMap data={testData} />);

    expect(container.querySelector('#svg-turkiye-haritasi-container-tooltip')).toBeNull();
    expect(container.querySelector('style')).toBeNull();
  });

  it('keeps new tooltip props inert without showTooltip', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        renderTooltip={() => <strong>Custom</strong>}
        tooltipPosition="city"
        tooltipPortal={true}
        tooltipOffset={4}
        tooltipDelay={0}
      />,
    );

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
    advanceTimers(100);

    expect(container.querySelector('#svg-turkiye-haritasi-container-tooltip')).toBeNull();
    expect(container.querySelector('style')).toBeNull();
  });

  it('renders a hidden, empty tooltip when showTooltip is true', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = getTooltip(container);

    expect(tooltip).toBeEmptyDOMElement();
    expect(tooltip).toHaveAttribute('role', 'tooltip');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    expect(tooltip).toHaveStyle({
      left: '0px',
      top: '0px',
      visibility: 'hidden',
      pointerEvents: 'none',
    });
  });

  it('delays the first reveal and then shows the hovered city name', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = getTooltip(container);

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
    expect(tooltip).toHaveStyle({ visibility: 'hidden' });
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');

    advanceTimers(79);
    expect(tooltip).toHaveStyle({ visibility: 'hidden' });

    advanceTimers(1);
    expect(tooltip).toHaveTextContent('Alpha');
    expect(tooltip).toHaveStyle({ visibility: 'visible' });
    expect(tooltip).not.toHaveAttribute('aria-hidden');
  });

  it('updates the tooltip text when moving to a different city', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = getTooltip(container);

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
    advanceTimers(80);
    expect(tooltip).toHaveTextContent('Alpha');

    fireEvent.mouseEnter(getCityGroup(container, 'Beta'));
    expect(tooltip).toHaveTextContent('Beta');
    expect(tooltip).toHaveStyle({ visibility: 'visible' });
  });

  it('prefers tooltipText over the hovered city name', () => {
    const { container } = render(
      <TurkeyMap data={testData} showTooltip={true} tooltipText="Custom text" />,
    );
    const tooltip = getTooltip(container);

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
    advanceTimers(80);

    expect(tooltip).toHaveTextContent('Custom text');
    expect(tooltip).not.toHaveTextContent('Alpha');
  });

  it('falls back to the province name for an empty tooltipText', () => {
    const { container } = render(
      <TurkeyMap data={testData} showTooltip={true} tooltipText="" />,
    );
    const tooltip = getTooltip(container);

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
    advanceTimers(80);

    expect(tooltip).toHaveTextContent('Alpha');
  });

  it('renders the fade-out keyframes when showTooltip is true', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const style = container.querySelector('style');

    expect(style).toBeInTheDocument();
    expect(style).toHaveTextContent('@keyframes turkey_react_map_tooltip_fade_out');
  });

  describe('custom content', () => {
    it('renders custom elements and passes the live city object and undefined value', () => {
      const renderTooltip = jest.fn((city) => <strong>{city.name} card</strong>);
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} renderTooltip={renderTooltip} />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
      advanceTimers(80);

      expect(renderTooltip).toHaveBeenCalledWith(alpha, undefined);
      expect(tooltip).toHaveTextContent('Alpha card');
      expect(tooltip.querySelector('strong')).toBeInTheDocument();
      expect(tooltip).toHaveStyle({ width: 'auto', maxWidth: '320px', whiteSpace: 'normal' });
    });

    it('keeps the built-in text width when renderTooltip is omitted', () => {
      const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
      advanceTimers(80);

      expect(tooltip.style.width).toBe('120px');
      expect(tooltip.style.maxWidth).toBe('');
    });

    it('takes precedence over tooltipText for enabled cities', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          showTooltip={true}
          tooltipText="Fallback"
          renderTooltip={(city) => `Custom ${city.name}`}
        />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
      advanceTimers(80);

      expect(tooltip).toHaveTextContent('Custom Alpha');
      expect(tooltip).not.toHaveTextContent('Fallback');
    });

    it('takes precedence over disabledTooltipText for disabled cities', () => {
      const { container } = render(
        <TurkeyMap
          data={customDisabledData}
          showTooltip={true}
          tooltipText="Fallback"
          disabledTooltipText="Not available"
          renderTooltip={(city) => `Custom ${city.name}`}
        />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
      advanceTimers(80);

      expect(tooltip).toHaveTextContent('Custom Alpha');
      expect(tooltip).not.toHaveTextContent('Not available');
    });

    it('passes custom dataset objects verbatim', () => {
      const richAlpha = {
        ...alpha,
        region: 'coast',
      } as typeof alpha;
      const renderTooltip = jest.fn(() => 'Rich');
      const { container } = render(
        <TurkeyMap
          data={{ cities: [richAlpha, beta] }}
          showTooltip={true}
          renderTooltip={renderTooltip}
        />,
      );

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
      advanceTimers(80);

      expect(renderTooltip).toHaveBeenCalledWith(richAlpha, undefined);
    });

    it('forwards the current choropleth value to the renderer', () => {
      const renderTooltip = jest.fn((city, value) => `${city.name}: ${String(value)}`);
      const { container } = render(
        <TurkeyMap
          data={testData}
          showTooltip={true}
          values={{ alpha: 92 }}
          renderTooltip={renderTooltip}
        />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
      advanceTimers(80);

      expect(renderTooltip).toHaveBeenCalledWith(alpha, 92);
      expect(tooltip).toHaveTextContent('Alpha: 92');
    });

    it('forwards undefined for a province without a value', () => {
      const renderTooltip = jest.fn((city) => city.name);
      const { container } = render(
        <TurkeyMap
          data={testData}
          showTooltip={true}
          values={{ alpha: 92 }}
          renderTooltip={renderTooltip}
        />,
      );

      fireEvent.mouseEnter(getCityGroup(container, 'Beta'));
      advanceTimers(80);

      expect(renderTooltip).toHaveBeenCalledWith(beta, undefined);
    });

    it.each([
      ['null', () => null],
      ['false', () => false],
      ['undefined', () => undefined],
    ])('renders an empty container for %s output', (_label, renderTooltip) => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} renderTooltip={renderTooltip} />,
      );
      const tooltip = getTooltip(container);

      expect(() => {
        fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
        advanceTimers(80);
      }).not.toThrow();

      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toBeEmptyDOMElement();
      expect(tooltip).toHaveStyle({ visibility: 'visible' });
    });
  });

  describe('positioning', () => {
    it('uses the default cursor displacement of +16 / -32', () => {
      const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
      const tooltip = getTooltip(container);
      const group = getCityGroup(container, 'Alpha');

      fireEvent.mouseEnter(group, { clientX: 100, clientY: 200 });
      advanceTimers(80);

      expect(tooltip).toHaveStyle({
        left: '116px',
        top: '168px',
        position: 'absolute',
      });
    });

    it('tracks the pointer on move', () => {
      const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
      const tooltip = getTooltip(container);
      const group = getCityGroup(container, 'Alpha');

      fireEvent.mouseEnter(group, { clientX: 100, clientY: 200 });
      advanceTimers(80);
      fireEvent.mouseMove(group, { clientX: 150, clientY: 250 });

      expect(tooltip).toHaveStyle({ left: '166px', top: '218px' });
    });

    it('applies a custom offset proportionally', () => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipOffset={8} />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'), { clientX: 100, clientY: 200 });
      advanceTimers(80);

      expect(tooltip).toHaveStyle({ left: '108px', top: '184px' });
    });

    it('anchors to the province bounds in city mode', () => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipPosition="city" />,
      );
      const tooltip = getTooltip(container);
      const group = getCityGroup(container, 'Alpha');
      mockCityBounds(group, { left: 100, top: 200, width: 50, height: 40 });

      fireEvent.mouseEnter(group, { clientX: 500, clientY: 500 });
      advanceTimers(80);

      expect(tooltip).toHaveStyle({
        left: '125px',
        top: '184px',
        position: 'absolute',
        transform: 'translate(-50%, -100%)',
      });
    });

    it('does not follow pointer movement in city mode', () => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipPosition="city" />,
      );
      const tooltip = getTooltip(container);
      const group = getCityGroup(container, 'Alpha');
      mockCityBounds(group, { left: 100, top: 200, width: 50, height: 40 });

      fireEvent.mouseEnter(group, { clientX: 10, clientY: 10 });
      advanceTimers(80);
      fireEvent.mouseMove(group, { clientX: 900, clientY: 900 });

      expect(tooltip).toHaveStyle({ left: '125px', top: '184px' });
    });

    it('updates city anchoring immediately when moving between provinces', () => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipPosition="city" />,
      );
      const tooltip = getTooltip(container);
      const alphaGroup = getCityGroup(container, 'Alpha');
      const betaGroup = getCityGroup(container, 'Beta');
      mockCityBounds(alphaGroup, { left: 100, top: 200, width: 50, height: 40 });
      mockCityBounds(betaGroup, { left: 300, top: 100, width: 60, height: 20 });

      fireEvent.mouseEnter(alphaGroup);
      advanceTimers(80);
      expect(tooltip).toHaveTextContent('Alpha');

      fireEvent.mouseEnter(betaGroup);

      expect(tooltip).toHaveTextContent('Beta');
      expect(tooltip).toHaveStyle({ left: '330px', top: '84px' });
    });

    it.each([
      ['NaN', Number.NaN, '16'],
      ['Infinity', Number.POSITIVE_INFINITY, '16'],
    ])('falls back to the default offset for %s', (_label, offset, renderedOffset) => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipOffset={offset} />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'), { clientX: 100, clientY: 200 });
      advanceTimers(80);

      expect(tooltip.style.left).toBe(`${100 + Number(renderedOffset)}px`);
      expect(tooltip.style.top).toBe(`${200 - 2 * Number(renderedOffset)}px`);
    });

    it('clamps a negative offset to zero', () => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipOffset={-10} />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'), { clientX: 100, clientY: 200 });
      advanceTimers(80);

      expect(tooltip).toHaveStyle({ left: '100px', top: '200px' });
    });

    it('treats a non-numeric runtime offset as the default', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          showTooltip={true}
          tooltipOffset={'8' as unknown as number}
        />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'), { clientX: 100, clientY: 200 });
      advanceTimers(80);

      expect(tooltip).toHaveStyle({ left: '116px', top: '168px' });
    });
  });

  describe('hover intent', () => {
    it('waits for a custom delay before revealing', () => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipDelay={100} />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
      advanceTimers(99);
      expect(tooltip).toHaveStyle({ visibility: 'hidden' });

      advanceTimers(1);
      expect(tooltip).toHaveStyle({ visibility: 'visible' });
    });

    it('cancels a pending reveal when the pointer leaves early', () => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipDelay={100} />,
      );
      const tooltip = getTooltip(container);
      const group = getCityGroup(container, 'Alpha');

      fireEvent.mouseEnter(group);
      advanceTimers(50);
      fireEvent.mouseLeave(group);
      advanceTimers(200);

      expect(tooltip).toHaveStyle({ visibility: 'hidden' });
      expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    });

    it('does not restart the delay between adjacent provinces', () => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipDelay={100} />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
      advanceTimers(100);
      expect(tooltip).toHaveTextContent('Alpha');

      fireEvent.mouseEnter(getCityGroup(container, 'Beta'));

      expect(tooltip).toHaveTextContent('Beta');
      expect(tooltip).toHaveStyle({ visibility: 'visible' });
    });

    it('keeps the tooltip through a short empty gap', () => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipDelay={100} />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
      advanceTimers(100);
      fireEvent.mouseLeave(getCityGroup(container, 'Alpha'));
      advanceTimers(50);
      fireEvent.mouseEnter(getCityGroup(container, 'Beta'));
      advanceTimers(100);

      expect(tooltip).toHaveTextContent('Beta');
      expect(tooltip).toHaveStyle({ visibility: 'visible' });
    });

    it('reveals immediately with tooltipDelay={0}', () => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipDelay={0} />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
      advanceTimers(0);

      expect(tooltip).toHaveStyle({ visibility: 'visible' });
    });

    it('clamps a negative delay to zero', () => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipDelay={-20} />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
      advanceTimers(0);

      expect(tooltip).toHaveStyle({ visibility: 'visible' });
    });

    it('falls back to the default delay for a non-finite value', () => {
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipDelay={Number.NaN} />,
      );
      const tooltip = getTooltip(container);

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
      advanceTimers(79);
      expect(tooltip).toHaveStyle({ visibility: 'hidden' });

      advanceTimers(1);
      expect(tooltip).toHaveStyle({ visibility: 'visible' });
    });

    it('clears pending reveal timers on unmount', () => {
      const { container, unmount } = render(
        <TurkeyMap data={testData} showTooltip={true} tooltipDelay={100} />,
      );

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
      expect(jest.getTimerCount()).toBe(1);

      unmount();

      expect(jest.getTimerCount()).toBe(0);
    });

    it('retains the last content during the fade-out', () => {
      const matchMedia = installMatchMedia(false);
      const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
      const tooltip = getTooltip(container);
      const group = getCityGroup(container, 'Alpha');

      try {
        fireEvent.mouseEnter(group);
        advanceTimers(80);
        expect(tooltip).toHaveTextContent('Alpha');

        fireEvent.mouseLeave(group);
        advanceTimers(80);

        expect(tooltip).toHaveTextContent('Alpha');
        expect(tooltip.style.animation).toContain('turkey_react_map_tooltip_fade_out');
        expect(tooltip).toHaveAttribute('aria-hidden', 'true');
      } finally {
        matchMedia.restore();
      }
    });

    it('re-enters immediately while the fade animation is running', () => {
      const matchMedia = installMatchMedia(false);
      const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
      const tooltip = getTooltip(container);
      const group = getCityGroup(container, 'Alpha');

      try {
        fireEvent.mouseEnter(group);
        advanceTimers(80);
        fireEvent.mouseLeave(group);
        advanceTimers(80);
        expect(tooltip.style.animation).toContain('turkey_react_map_tooltip_fade_out');

        fireEvent.mouseEnter(group);

        expect(tooltip.style.animation).toBe('');
        expect(tooltip).toHaveStyle({ visibility: 'visible' });
      } finally {
        matchMedia.restore();
      }
    });
  });

  it('preserves the existing callbacks and selection while tooltips are active', () => {
    const onHover = jest.fn();
    const onClick = jest.fn();
    const onSelect = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={testData}
        showTooltip={true}
        selectionMode="multiple"
        onHover={onHover}
        onClick={onClick}
        onSelect={onSelect}
      />,
    );
    const group = getCityGroup(container, 'Alpha');

    fireEvent.mouseEnter(group);
    fireEvent.mouseOver(getCityPath(group));
    fireEvent.click(getCityPath(group));
    advanceTimers(80);

    expect(onHover).toHaveBeenCalledWith(alpha);
    expect(onClick).toHaveBeenCalledWith(alpha);
    expect(onSelect).toHaveBeenCalledWith(alpha);
    expect(testCities).toHaveLength(2);
  });
});
