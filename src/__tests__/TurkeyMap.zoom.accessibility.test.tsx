import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import TurkeyMap from '../index';
import type { TurkeyMapRef } from '../types';
import { disabledAlpha, testData } from '../../tests/fixtures/cities';
import { getCityGroup, getCityPath, getSvg } from '../../tests/helpers';
import {
  getProvinceGroupTransform,
  mockSvgRect,
  parseTransform,
} from '../../tests/zoom-helpers';

expect.extend(toHaveNoViolations);

const getLiveRegion = (container: HTMLElement): HTMLElement => {
  const region = container.querySelector('[role="status"]');
  if (!(region instanceof HTMLElement)) {
    throw new Error('Live region was not rendered');
  }
  return region;
};

describe('TurkeyMap zoom accessibility', () => {
  it('makes only the zoomable SVG viewport an extra tab stop', () => {
    const { container, rerender } = render(<TurkeyMap data={testData} />);

    expect(getSvg(container)).not.toHaveAttribute('tabindex');
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);

    rerender(<TurkeyMap data={testData} zoomable />);

    expect(getSvg(container)).toHaveAttribute('tabindex', '0');
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(2);
  });

  it('labels the viewport and lets consumer labels win', () => {
    const { container, rerender } = render(<TurkeyMap data={testData} zoomable />);

    expect(getSvg(container).getAttribute('aria-label')).toContain('Use + and - to zoom');

    rerender(
      <TurkeyMap
        data={testData}
        zoomable
        svgProps={{ 'aria-label': 'Custom map' }}
      />,
    );

    expect(getSvg(container)).toHaveAttribute('aria-label', 'Custom map');
  });

  it('does not duplicate a consumer aria-labelledby', () => {
    const { container } = render(
      <>
        <span id="map-heading">Map heading</span>
        <TurkeyMap data={testData} zoomable svgProps={{ 'aria-labelledby': 'map-heading' }} />
      </>,
    );

    const svg = getSvg(container);
    expect(svg).toHaveAttribute('aria-labelledby', 'map-heading');
    expect(svg).not.toHaveAttribute('aria-label');
  });

  it('renders named controls only when zoomable and requested', () => {
    const { container, rerender } = render(<TurkeyMap data={testData} zoomable />);

    expect(screen.queryByRole('group', { name: 'Map zoom controls' })).toBeNull();
    expect(container.querySelector('.tm-zoom-controls')).toBeNull();

    rerender(<TurkeyMap data={testData} zoomable zoomControls />);

    expect(screen.getByRole('group', { name: 'Map zoom controls' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeInTheDocument();
  });

  it('warns and hides controls without zoomable', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { container } = render(<TurkeyMap data={testData} zoomControls />);

    expect(container.querySelector('.tm-zoom-controls')).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('require zoomable={true}'));
    warn.mockRestore();
  });

  it('disables controls at the bounds and reset position', () => {
    const ref = React.createRef<TurkeyMapRef>();
    const onViewportChange = jest.fn();
    render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        zoomControls
        onViewportChange={onViewportChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeDisabled();

    act(() => {
      ref.current?.zoomTo(8);
    });

    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeEnabled();
  });

  it('operates controls with pointer and keyboard without map activation', () => {
    const onClick = jest.fn();
    const onSelectionChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={testData}
        zoomable
        zoomControls
        onClick={onClick}
        selectionMode="single"
        onSelectionChange={onSelectionChange}
      />,
    );
    const svg = getSvg(container);
    mockSvgRect(svg);

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(parseTransform(getProvinceGroupTransform(container))?.scale).toBeCloseTo(1.5);

    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(parseTransform(getProvinceGroupTransform(container))).toEqual({
      scale: 1,
      translateX: 0,
      translateY: 0,
    });

    expect(onClick).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('activates controls with Enter and Space', async () => {
    const user = userEvent.setup();
    const { container } = render(<TurkeyMap data={testData} zoomable zoomControls />);
    mockSvgRect(getSvg(container)).mockReturnValue({
      left: 0,
      top: 0,
      width: 1050,
      height: 585,
      right: 1050,
      bottom: 585,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    zoomIn.focus();
    await user.keyboard('{Enter}');
    expect(parseTransform(getProvinceGroupTransform(container))?.scale).toBeCloseTo(1.5);

    const zoomOut = screen.getByRole('button', { name: 'Zoom out' });
    zoomOut.focus();
    await user.keyboard(' ');
    expect(parseTransform(getProvinceGroupTransform(container))?.scale).toBe(1);
  });

  it('supports viewport keyboard zoom, pan, and reset', () => {
    const ref = React.createRef<TurkeyMapRef>();
    const onViewportChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        onViewportChange={onViewportChange}
      />,
    );
    const svg = getSvg(container);

    fireEvent.keyDown(svg, { key: '+' });
    expect(parseTransform(getProvinceGroupTransform(container))?.scale).toBeCloseTo(1.5);

    fireEvent.keyDown(svg, { key: '=' });
    expect(parseTransform(getProvinceGroupTransform(container))?.scale).toBeCloseTo(2.25);

    fireEvent.keyDown(svg, { key: '-' });
    expect(parseTransform(getProvinceGroupTransform(container))?.scale).toBeCloseTo(1.5);

    fireEvent.keyDown(svg, { key: '_' });
    expect(parseTransform(getProvinceGroupTransform(container))?.scale).toBe(1);

    act(() => {
      ref.current?.zoomTo(2);
    });
    onViewportChange.mockClear();

    fireEvent.keyDown(svg, { key: 'ArrowLeft' });
    expect((onViewportChange.mock.calls[0][0] as { translateX: number }).translateX)
      .toBeCloseTo(-710);

    onViewportChange.mockClear();
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    expect((onViewportChange.mock.calls[0][0] as { translateX: number }).translateX)
      .toBeCloseTo(-605);

    onViewportChange.mockClear();
    fireEvent.keyDown(svg, { key: 'ArrowUp' });
    expect((onViewportChange.mock.calls[0][0] as { translateY: number }).translateY)
      .toBeCloseTo(-351);

    onViewportChange.mockClear();
    fireEvent.keyDown(svg, { key: 'ArrowDown' });
    expect((onViewportChange.mock.calls[0][0] as { translateY: number }).translateY)
      .toBeCloseTo(-292.5);

    fireEvent.keyDown(svg, { key: '0' });
    expect(parseTransform(getProvinceGroupTransform(container))).toEqual({
      scale: 1,
      translateX: 0,
      translateY: 0,
    });
  });

  it('leaves unhandled viewport keys alone', () => {
    const { container } = render(<TurkeyMap data={testData} zoomable />);
    const before = getProvinceGroupTransform(container);

    fireEvent.keyDown(getSvg(container), { key: 'Tab' });

    expect(getProvinceGroupTransform(container)).toBe(before);
  });

  it('ignores viewport shortcuts that bubble from a province path', () => {
    const { container } = render(<TurkeyMap data={testData} zoomable />);
    const path = getCityPath(getCityGroup(container, 'Alpha'));
    const before = getProvinceGroupTransform(container);

    fireEvent.keyDown(path, { key: 'a' });

    expect(getProvinceGroupTransform(container)).toBe(before);
  });

  it('does not add a viewport tab stop or shortcuts without zoomable', () => {
    const { container } = render(<TurkeyMap data={testData} />);
    const svg = getSvg(container);
    const before = getProvinceGroupTransform(container);

    fireEvent.keyDown(svg, { key: '+' });

    expect(svg).not.toHaveAttribute('tabindex');
    expect(getProvinceGroupTransform(container)).toBe(before);
  });

  it('preserves province navigation in a zoomable map', () => {
    const { container } = render(
      <TurkeyMap data={testData} zoomable selectionMode="single" />,
    );
    const alpha = getCityGroup(container, 'Alpha');
    const beta = getCityGroup(container, 'Beta');
    const before = getProvinceGroupTransform(container);

    fireEvent.focus(alpha);
    fireEvent.keyDown(alpha, { key: 'ArrowRight' });

    expect(beta).toHaveAttribute('tabindex', '0');
    expect(alpha).toHaveAttribute('tabindex', '-1');
    expect(getProvinceGroupTransform(container)).toBe(before);
  });

  it('preserves Home, End, Enter, Escape, and live announcements', () => {
    const onSelectionChange = jest.fn();
    const { container, rerender } = render(
      <TurkeyMap
        data={testData}
        zoomable
        selectionMode="single"
        onSelectionChange={onSelectionChange}
      />,
    );
    const alpha = getCityGroup(container, 'Alpha');
    const beta = getCityGroup(container, 'Beta');

    fireEvent.focus(alpha);
    expect(getLiveRegion(container)).toHaveTextContent('Alpha, plate 1');

    fireEvent.keyDown(alpha, { key: 'End' });
    expect(beta).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(beta, { key: 'Enter' });
    expect(beta).toHaveAttribute('aria-selected', 'true');

    rerender(
      <TurkeyMap
        data={testData}
        zoomable
        selectionMode="single"
        defaultSelectedCity="alpha"
        onSelectionChange={onSelectionChange}
      />,
    );
    const selectedAlpha = getCityGroup(container, 'Alpha');
    fireEvent.keyDown(selectedAlpha, { key: 'Escape' });
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('keeps disabled provinces inert in a zoomable map', () => {
    const onSelectionChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={{ cities: [disabledAlpha, testData.cities[1]] }}
        zoomable
        selectionMode="single"
        onSelectionChange={onSelectionChange}
      />,
    );
    const alpha = getCityGroup(container, 'Alpha');

    fireEvent.focus(alpha);
    fireEvent.keyDown(alpha, { key: 'Enter' });
    fireEvent.keyDown(alpha, { key: ' ' });

    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(getLiveRegion(container)).toHaveTextContent('Alpha, plate 1, disabled');
  });

  it('has no automated accessibility violations when zoomable', async () => {
    const { container } = render(
      <TurkeyMap data={testData} zoomable zoomControls ariaLabel="Turkey map" />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
