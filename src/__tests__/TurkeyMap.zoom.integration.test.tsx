import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import type { TurkeyMapRef } from '../types';
import { testData } from '../../tests/fixtures/cities';
import {
  getCityGroup,
  getCityPath,
  getSvg,
  getTooltip,
} from '../../tests/helpers';
import {
  createCountingCity,
  expectOnlyRendered,
  resetCounts,
} from '../../tests/render-counts';
import {
  dispatchWheel,
  mockCityRect,
  mockSvgRect,
} from '../../tests/zoom-helpers';

describe('TurkeyMap zoom tooltip anchoring', () => {
  it('repositions a city-anchored tooltip after zoom and pan', () => {
    const ref = React.createRef<TurkeyMapRef>();
    const onHover = jest.fn();
    const { container } = render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        showTooltip
        tooltipPosition="city"
        tooltipDelay={0}
        onHover={onHover}
      />,
    );
    const alpha = getCityGroup(container, 'Alpha');
    const path = getCityPath(alpha);
    const tooltip = getTooltip(container);
    mockCityRect(alpha, { left: 100, top: 100, width: 20, height: 20 });

    fireEvent.mouseEnter(alpha);
    fireEvent.mouseOver(path);

    expect(tooltip).toHaveStyle({ left: '110px', top: '84px' });
    expect(onHover).toHaveBeenCalledTimes(1);

    mockCityRect(alpha, { left: 200, top: 150, width: 20, height: 20 });
    act(() => {
      ref.current?.zoomTo(2);
    });

    expect(tooltip).toHaveStyle({ left: '210px', top: '134px' });
    expect(onHover).toHaveBeenCalledTimes(1);
  });

  it('leaves cursor-positioned tooltips alone when the viewport changes', () => {
    const ref = React.createRef<TurkeyMapRef>();
    const { container } = render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        showTooltip
        tooltipDelay={0}
      />,
    );
    const alpha = getCityGroup(container, 'Alpha');
    const path = getCityPath(alpha);
    const tooltip = getTooltip(container);

    fireEvent.mouseEnter(alpha);
    fireEvent.mouseMove(path, { pageX: 40, pageY: 50, clientX: 40, clientY: 50 });

    expect(tooltip).toHaveStyle({ left: '56px', top: '18px' });

    act(() => {
      ref.current?.zoomTo(2);
    });

    expect(tooltip).toHaveStyle({ left: '56px', top: '18px' });
  });

  it('does not reveal or move a hidden tooltip on viewport change', () => {
    const ref = React.createRef<TurkeyMapRef>();
    const { container } = render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        showTooltip
        tooltipPosition="city"
        tooltipDelay={0}
      />,
    );
    const tooltip = getTooltip(container);
    const before = tooltip.getAttribute('style');

    act(() => {
      ref.current?.zoomTo(2);
    });

    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    expect(tooltip.getAttribute('style')).toBe(before);
  });
});

describe('TurkeyMap zoom render isolation', () => {
  const createCities = () => {
    const alpha = createCountingCity('alpha', 1, 'Alpha', 'M 0 0 L 10 10 L 0 10 Z');
    const beta = createCountingCity('beta', 2, 'Beta', 'M 20 20 L 30 30 L 20 30 Z');
    const gamma = createCountingCity('gamma', 3, 'Gamma', 'M 40 40 L 50 50 L 40 50 Z');

    return {
      alpha,
      beta,
      gamma,
      all: { alpha, beta, gamma },
      data: { cities: [alpha.city, beta.city, gamma.city] },
    };
  };

  it('does not re-render provinces for ref, wheel, or drag viewport changes', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const ref = React.createRef<TurkeyMapRef>();
    const { container } = render(
      <TurkeyMap ref={ref} data={data} zoomable />,
    );
    const svg = getSvg(container);
    mockSvgRect(svg);

    resetCounts(alpha, beta, gamma);
    act(() => {
      ref.current?.zoomTo(2);
    });
    expectOnlyRendered(all, []);

    resetCounts(alpha, beta, gamma);
    act(() => {
      dispatchWheel(svg, { clientX: 525, clientY: 292.5, deltaY: -100 });
    });
    expectOnlyRendered(all, []);

    resetCounts(alpha, beta, gamma);
    fireEvent.pointerDown(svg, {
      pointerId: 1,
      button: 0,
      clientX: 500,
      clientY: 300,
    });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 600, clientY: 300 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 600, clientY: 300 });
    expectOnlyRendered(all, []);
  });

  it('preserves selection, disabled, and focus state while zooming', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        zoomable
        zoomControls
        selectionMode="multiple"
        selectedCities={['alpha']}
        disabledCities={['beta']}
      />,
    );
    const alpha = getCityGroup(container, 'Alpha');
    const beta = getCityGroup(container, 'Beta');

    fireEvent.focus(alpha);
    fireEvent.click(screenGetZoomIn(container));

    expect(alpha).toHaveAttribute('aria-selected', 'true');
    expect(beta).toHaveAttribute('aria-disabled', 'true');
    expect(alpha.style.outline).toBe('2px solid #1a73e8');
  });
});

const screenGetZoomIn = (container: HTMLElement): HTMLElement => {
  const button = container.querySelector('[aria-label="Zoom in"]');
  if (!(button instanceof HTMLElement)) {
    throw new Error('Zoom in button was not rendered');
  }
  return button;
};
