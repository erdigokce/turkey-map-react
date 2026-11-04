import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import type { TurkeyMapRef, Viewport } from '../types';
import { testData } from '../../tests/fixtures/cities';
import { getCityGroup, getCityPath, getSvg } from '../../tests/helpers';
import { installPointerEvent } from '../../tests/tooltip-helpers';
import {
  getProvinceGroupTransform,
  mockSvgRect,
  parseTransform,
} from '../../tests/zoom-helpers';

const initialTransform = { scale: 1, translateX: 0, translateY: 0 };

const renderZoomed = (
  scale = 2,
  options: { onClick?: jest.Mock } = {},
) => {
  const onViewportChange = jest.fn();
  const ref = React.createRef<TurkeyMapRef>();
  const utils = render(
    <TurkeyMap
      ref={ref}
      data={testData}
      zoomable
      selectionMode="single"
      onClick={options.onClick}
      onViewportChange={onViewportChange}
    />,
  );
  const svg = getSvg(utils.container);
  mockSvgRect(svg);
  act(() => {
    ref.current?.zoomTo(scale);
  });
  onViewportChange.mockClear();

  return { ...utils, ref, svg, onViewportChange };
};

describe('TurkeyMap zoom gestures', () => {
  let restorePointerEvent: () => void;

  beforeEach(() => {
    restorePointerEvent = installPointerEvent();
  });

  afterEach(() => {
    restorePointerEvent();
  });

  it('pans with a primary-pointer drag', () => {
    const { svg, onViewportChange, container } = renderZoomed(2);

    fireEvent.pointerDown(svg, {
      pointerId: 1,
      button: 0,
      clientX: 500,
      clientY: 300,
    });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 600, clientY: 300 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 600, clientY: 300 });

    expect(onViewportChange).toHaveBeenCalledTimes(1);
    expect((onViewportChange.mock.calls[0][0] as Viewport).translateX).toBe(-505);
    expect(parseTransform(getProvinceGroupTransform(container))?.translateX).toBe(-505);
  });

  it('does not pan below the mouse threshold', () => {
    const { svg, onViewportChange } = renderZoomed(2);

    fireEvent.pointerDown(svg, {
      pointerId: 1,
      button: 0,
      clientX: 500,
      clientY: 300,
    });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 502, clientY: 300 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 502, clientY: 300 });

    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('uses a larger threshold for touch pointers', () => {
    const { svg, onViewportChange } = renderZoomed(2);

    fireEvent.pointerDown(svg, {
      pointerId: 1,
      button: 0,
      pointerType: 'touch',
      clientX: 500,
      clientY: 300,
    });
    fireEvent.pointerMove(svg, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 506,
      clientY: 300,
    });
    expect(onViewportChange).not.toHaveBeenCalled();

    fireEvent.pointerMove(svg, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 510,
      clientY: 300,
    });
    expect(onViewportChange).toHaveBeenCalledTimes(1);
  });

  it('ignores secondary mouse buttons', () => {
    const onClick = jest.fn();
    const { container, svg, onViewportChange } = renderZoomed(2, { onClick });
    const path = getCityPath(getCityGroup(container, 'Alpha'));

    fireEvent.pointerDown(svg, {
      pointerId: 1,
      button: 2,
      clientX: 500,
      clientY: 300,
    });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 600, clientY: 300 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 600, clientY: 300 });
    fireEvent.click(path);

    expect(onViewportChange).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('pinches to zoom around the midpoint', () => {
    const { svg, onViewportChange, container } = renderZoomed(2);

    fireEvent.pointerDown(svg, {
      pointerId: 1,
      button: 0,
      pointerType: 'touch',
      clientX: 400,
      clientY: 300,
    });
    fireEvent.pointerDown(svg, {
      pointerId: 2,
      button: 0,
      pointerType: 'touch',
      clientX: 600,
      clientY: 300,
    });
    fireEvent.pointerMove(svg, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 300,
      clientY: 300,
    });

    expect((onViewportChange.mock.calls[0][0] as Viewport).scale).toBeCloseTo(3);
    expect(parseTransform(getProvinceGroupTransform(container))?.scale).toBeCloseTo(3);

    fireEvent.pointerUp(svg, { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 300 });
    fireEvent.pointerUp(svg, { pointerId: 2, pointerType: 'touch', clientX: 600, clientY: 300 });
  });

  it('continues panning with the remaining pointer after a pinch', () => {
    const { svg, onViewportChange } = renderZoomed(2);

    fireEvent.pointerDown(svg, {
      pointerId: 1,
      button: 0,
      pointerType: 'touch',
      clientX: 400,
      clientY: 300,
    });
    fireEvent.pointerDown(svg, {
      pointerId: 2,
      button: 0,
      pointerType: 'touch',
      clientX: 600,
      clientY: 300,
    });
    fireEvent.pointerUp(svg, { pointerId: 2, pointerType: 'touch', clientX: 600, clientY: 300 });
    onViewportChange.mockClear();

    fireEvent.pointerMove(svg, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 450,
      clientY: 300,
    });

    expect(onViewportChange).toHaveBeenCalledTimes(1);
  });

  it('cancels a pointer gesture without suppressing the next click', () => {
    const onClick = jest.fn();
    const { container } = renderZoomed(2, { onClick });
    const path = getCityPath(getCityGroup(container, 'Alpha'));

    fireEvent.pointerDown(path, {
      pointerId: 1,
      button: 0,
      clientX: 500,
      clientY: 300,
    });
    fireEvent.pointerMove(path, { pointerId: 1, clientX: 600, clientY: 300 });
    fireEvent.pointerCancel(path, { pointerId: 1, clientX: 600, clientY: 300 });
    fireEvent.click(path);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(parseTransform(getProvinceGroupTransform(container))).not.toEqual(initialTransform);
  });

  it('zooms in on double-click and clamps at the maximum', () => {
    const { svg, onViewportChange, container, ref } = renderZoomed(1);

    fireEvent.doubleClick(svg, { clientX: 525, clientY: 292.5 });

    expect((onViewportChange.mock.calls[0][0] as Viewport).scale).toBeCloseTo(1.5);
    expect(parseTransform(getProvinceGroupTransform(container))?.scale).toBeCloseTo(1.5);

    act(() => {
      ref.current?.zoomTo(8);
    });
    onViewportChange.mockClear();
    fireEvent.doubleClick(svg, { clientX: 525, clientY: 292.5 });

    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('ignores double-click when the map cannot be measured', () => {
    const onViewportChange = jest.fn();
    const { container } = render(
      <TurkeyMap data={testData} zoomable onViewportChange={onViewportChange} />,
    );

    fireEvent.doubleClick(getSvg(container), { clientX: 100, clientY: 100 });

    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('suppresses click and selection after a drag, then recovers', () => {
    const onClick = jest.fn();
    const ref = React.createRef<TurkeyMapRef>();
    const onSelectionChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        selectionMode="single"
        onClick={onClick}
        onSelectionChange={onSelectionChange}
      />,
    );
    const svg = getSvg(container);
    mockSvgRect(svg);
    const path = getCityPath(getCityGroup(container, 'Alpha'));
    act(() => {
      ref.current?.zoomTo(2);
    });

    fireEvent.pointerDown(path, {
      pointerId: 1,
      button: 0,
      clientX: 500,
      clientY: 300,
    });
    fireEvent.pointerMove(path, { pointerId: 1, clientX: 600, clientY: 300 });
    fireEvent.pointerUp(path, { pointerId: 1, clientX: 600, clientY: 300 });
    fireEvent.click(path);

    expect(onClick).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();

    fireEvent.pointerDown(path, {
      pointerId: 1,
      button: 0,
      clientX: 500,
      clientY: 300,
    });
    fireEvent.pointerUp(path, { pointerId: 1, clientX: 500, clientY: 300 });
    fireEvent.click(path);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
  });

  it('uses and releases pointer capture when available', () => {
    const { svg } = renderZoomed(2);
    const setPointerCapture = jest.fn();
    const releasePointerCapture = jest.fn();
    Object.defineProperty(svg, 'setPointerCapture', {
      configurable: true,
      value: setPointerCapture,
    });
    Object.defineProperty(svg, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCapture,
    });

    fireEvent.pointerDown(svg, {
      pointerId: 7,
      button: 0,
      clientX: 500,
      clientY: 300,
    });
    fireEvent.pointerUp(svg, { pointerId: 7, clientX: 500, clientY: 300 });

    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(releasePointerCapture).toHaveBeenCalledWith(7);
  });

  it('tolerates pointer capture failures', () => {
    const { svg } = renderZoomed(2);
    Object.defineProperty(svg, 'setPointerCapture', {
      configurable: true,
      value: () => {
        throw new Error('capture failed');
      },
    });
    Object.defineProperty(svg, 'releasePointerCapture', {
      configurable: true,
      value: () => {
        throw new Error('release failed');
      },
    });

    expect(() => {
      fireEvent.pointerDown(svg, {
        pointerId: 7,
        button: 0,
        clientX: 500,
        clientY: 300,
      });
      fireEvent.pointerUp(svg, { pointerId: 7, clientX: 500, clientY: 300 });
    }).not.toThrow();
  });

  it('respects consumer-prevented viewport events', () => {
    const onViewportChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={testData}
        zoomable
        onViewportChange={onViewportChange}
        svgProps={{
          onPointerDown: (event) => event.preventDefault(),
          onPointerMove: (event) => event.preventDefault(),
          onPointerUp: (event) => event.preventDefault(),
          onPointerCancel: (event) => event.preventDefault(),
          onDoubleClick: (event) => event.preventDefault(),
          onKeyDown: (event) => event.preventDefault(),
        }}
      />,
    );
    const svg = getSvg(container);
    mockSvgRect(svg);

    fireEvent.pointerDown(svg, { pointerId: 1, button: 0, clientX: 500, clientY: 300 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 600, clientY: 300 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 600, clientY: 300 });
    fireEvent.pointerCancel(svg, { pointerId: 1, clientX: 600, clientY: 300 });
    fireEvent.doubleClick(svg, { clientX: 525, clientY: 292.5 });
    fireEvent.keyDown(svg, { key: '+' });

    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('ignores a drag when the map rect becomes unusable', () => {
    const { svg, onViewportChange } = renderZoomed(2);

    fireEvent.pointerDown(svg, {
      pointerId: 1,
      button: 0,
      clientX: 500,
      clientY: 300,
    });
    mockSvgRect(svg, { width: 0, height: 0 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 600, clientY: 300 });

    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('clears drag suppression after a tick', async () => {
    const onClick = jest.fn();
    const { container, svg } = renderZoomed(2, { onClick });
    const path = getCityPath(getCityGroup(container, 'Alpha'));

    fireEvent.pointerDown(path, {
      pointerId: 1,
      button: 0,
      clientX: 500,
      clientY: 300,
    });
    fireEvent.pointerMove(path, { pointerId: 1, clientX: 600, clientY: 300 });
    fireEvent.pointerUp(path, { pointerId: 1, clientX: 600, clientY: 300 });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    fireEvent.click(path);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('suppresses a drag that ends outside a province', () => {
    const onClick = jest.fn();
    const { container } = render(
      <TurkeyMap data={testData} zoomable onClick={onClick} />,
    );
    const svg = getSvg(container);
    mockSvgRect(svg);
    const path = getCityPath(getCityGroup(container, 'Alpha'));

    fireEvent.pointerDown(path, {
      pointerId: 1,
      button: 0,
      clientX: 500,
      clientY: 300,
    });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 700, clientY: 300 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 700, clientY: 300 });
    fireEvent.click(path);

    expect(onClick).not.toHaveBeenCalled();
  });
});
