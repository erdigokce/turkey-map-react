import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import '@testing-library/jest-dom';
import { useTurkeyMap } from '../index';
import type { Data, UseTurkeyMapOptions } from '../index';
import { testData } from '../../tests/fixtures/cities';
import {
  advanceTimers,
  installMatchMedia,
  mockCityBounds,
} from '../../tests/tooltip-helpers';

type TooltipOptions = Omit<UseTurkeyMapOptions, 'data'> & {
  data: Data;
};

const TooltipHarness = ({ data, ...options }: TooltipOptions) => {
  const {
    getContainerProps,
    getCityProps,
    getTooltipProps,
    tooltipCity,
    tooltipVisible,
  } = useTurkeyMap({ data, ...options });

  return (
    <div>
      <div {...getContainerProps()}>
        {data.cities.map((city) => (
          <div key={city.id} data-testid={`tip-city-${city.id}`} {...getCityProps(city)}>
            {city.name}
          </div>
        ))}
      </div>
      <div data-testid="tip" {...getTooltipProps()}>{tooltipCity?.name ?? ''}</div>
      <div data-testid="tip-visible">{String(tooltipVisible)}</div>
    </div>
  );
};

describe('useTurkeyMap tooltip', () => {
  let restoreMatchMedia: (() => void) | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    restoreMatchMedia?.();
    restoreMatchMedia = undefined;
  });

  it('is opt-in and keeps the tooltip hidden by default', () => {
    render(<TooltipHarness data={testData} />);

    fireEvent.mouseEnter(screen.getByTestId('tip-city-alpha'));

    expect(screen.getByTestId('tip-visible')).toHaveTextContent('false');
    expect(screen.getByTestId('tip')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('tip')).toHaveTextContent('');
    expect(screen.getByTestId('tip').style.pointerEvents).toBe('none');
  });

  it('reveals after the hover-intent delay and hides on leave', () => {
    render(<TooltipHarness data={testData} showTooltip={true} tooltipDelay={80} />);

    const tooltip = screen.getByTestId('tip');
    const city = screen.getByTestId('tip-city-alpha');

    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    fireEvent.mouseEnter(city);
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');

    advanceTimers(80);

    expect(tooltip).not.toHaveAttribute('aria-hidden');
    expect(tooltip).toHaveTextContent('Alpha');
    expect(screen.getByTestId('tip-visible')).toHaveTextContent('true');

    fireEvent.mouseLeave(city);
    advanceTimers(80);

    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('tip-visible')).toHaveTextContent('false');
  });

  it('follows the cursor with the existing displacement', () => {
    render(
      <TooltipHarness
        data={testData}
        showTooltip={true}
        tooltipDelay={0}
        tooltipPosition="cursor"
        tooltipOffset={16}
      />,
    );

    const city = screen.getByTestId('tip-city-alpha');
    fireEvent.mouseEnter(city);
    fireEvent.mouseMove(city, { pageX: 100, pageY: 200, clientX: 100, clientY: 200 });
    advanceTimers(0);

    expect(screen.getByTestId('tip')).toHaveStyle({
      position: 'absolute',
      left: '116px',
      top: '168px',
      visibility: 'visible',
    });
  });

  it('anchors above and centers on the city when requested', () => {
    render(
      <TooltipHarness
        data={testData}
        showTooltip={true}
        tooltipDelay={0}
        tooltipPosition="city"
        tooltipOffset={16}
      />,
    );

    const city = screen.getByTestId('tip-city-alpha');
    mockCityBounds(city, { left: 100, top: 50, width: 40, height: 20 });

    fireEvent.mouseEnter(city);
    advanceTimers(0);

    expect(screen.getByTestId('tip')).toHaveStyle({
      position: 'absolute',
      left: '120px',
      top: '34px',
      transform: 'translate(-50%, -100%)',
      visibility: 'visible',
    });
  });

  it('uses client coordinates and fixed positioning in portal mode', () => {
    render(
      <TooltipHarness
        data={testData}
        showTooltip={true}
        tooltipDelay={0}
        tooltipPortal={true}
        tooltipOffset={8}
      />,
    );

    const city = screen.getByTestId('tip-city-alpha');
    fireEvent.mouseEnter(city);
    fireEvent.mouseMove(city, { pageX: 100, pageY: 200, clientX: 300, clientY: 400 });
    advanceTimers(0);

    expect(screen.getByTestId('tip')).toHaveStyle({
      position: 'fixed',
      left: '308px',
      top: '384px',
    });
  });

  it('reveals a city-anchored tooltip on keyboard focus without the delay', () => {
    render(
      <TooltipHarness
        data={testData}
        showTooltip={true}
        tooltipDelay={100}
        tooltipPosition="cursor"
      />,
    );

    const city = screen.getByTestId('tip-city-alpha');
    mockCityBounds(city, { left: 10, top: 20, width: 30, height: 40 });

    fireEvent.focus(city);

    expect(screen.getByTestId('tip-visible')).toHaveTextContent('true');
    expect(screen.getByTestId('tip')).toHaveStyle({
      left: '25px',
      top: '4px',
      transform: 'translate(-50%, -100%)',
    });
  });

  it('shows the tooltip for disabled cities without firing hover callbacks', () => {
    const onHover = jest.fn();
    render(
      <TooltipHarness
        data={testData}
        showTooltip={true}
        tooltipDelay={0}
        disabledCities={['alpha']}
        onHover={onHover}
      />,
    );

    fireEvent.mouseEnter(screen.getByTestId('tip-city-alpha'));
    advanceTimers(0);

    expect(screen.getByTestId('tip')).toHaveTextContent('Alpha');
    expect(onHover).not.toHaveBeenCalled();
  });

  it('does not dispatch selection callbacks for tooltip interactions', () => {
    const onSelectionChange = jest.fn();
    render(
      <TooltipHarness
        data={testData}
        showTooltip={true}
        tooltipDelay={0}
        selectionMode="multiple"
        onSelectionChange={onSelectionChange}
      />,
    );

    const city = screen.getByTestId('tip-city-alpha');
    fireEvent.mouseEnter(city);
    fireEvent.mouseMove(city, { pageX: 1, pageY: 2, clientX: 1, clientY: 2 });
    fireEvent.mouseLeave(city);
    advanceTimers(0);

    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('uses reduced motion when hiding an animated tooltip', () => {
    const matchMedia = installMatchMedia(true);
    restoreMatchMedia = matchMedia.restore;
    render(
      <TooltipHarness
        data={testData}
        showTooltip={true}
        tooltipDelay={0}
        tooltipAnimationName="headless-tooltip-fade"
      />,
    );

    const city = screen.getByTestId('tip-city-alpha');
    fireEvent.mouseEnter(city);
    advanceTimers(0);
    fireEvent.mouseLeave(city);
    advanceTimers(80);

    const tooltip = screen.getByTestId('tip');
    expect(tooltip).toHaveStyle({ visibility: 'hidden' });
    expect(tooltip.style.animation).toBe('');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the fade animation when motion is allowed', () => {
    const matchMedia = installMatchMedia(false);
    restoreMatchMedia = matchMedia.restore;
    render(
      <TooltipHarness
        data={testData}
        showTooltip={true}
        tooltipDelay={0}
        tooltipAnimationName="headless-tooltip-fade"
      />,
    );

    const city = screen.getByTestId('tip-city-alpha');
    fireEvent.mouseEnter(city);
    advanceTimers(0);
    fireEvent.mouseLeave(city);
    advanceTimers(80);

    const tooltip = screen.getByTestId('tip');
    expect(tooltip.style.animation).toContain('headless-tooltip-fade');
    expect(tooltip.style.visibility).toBe('');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });

  it('hides without an animation when matchMedia is unavailable', () => {
    delete (window as unknown as { matchMedia?: typeof window.matchMedia }).matchMedia;
    render(
      <TooltipHarness
        data={testData}
        showTooltip={true}
        tooltipDelay={0}
        tooltipAnimationName="headless-tooltip-fade"
      />,
    );

    const city = screen.getByTestId('tip-city-alpha');
    fireEvent.mouseEnter(city);
    advanceTimers(0);
    fireEvent.mouseLeave(city);
    advanceTimers(80);

    const tooltip = screen.getByTestId('tip');
    expect(tooltip).toHaveStyle({ visibility: 'hidden' });
    expect(tooltip.style.animation).toBe('');
  });

  it('renders on the server without accessing document', () => {
    const html = renderToStaticMarkup(
      <TooltipHarness data={testData} showTooltip={true} />,
    );

    expect(html).toContain('role="tooltip"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-tm-map-container');
  });
});
