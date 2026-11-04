import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import type { TurkeyMapRef, Viewport } from '../types';
import { testData } from '../../tests/fixtures/cities';
import { getCityGroup, getSvg } from '../../tests/helpers';
import {
  dispatchWheel,
  getProvinceGroupTransform,
  mockCityBBox,
  mockSvgRect,
  parseTransform,
} from '../../tests/zoom-helpers';

const initialViewport: Viewport = { scale: 1, translateX: 0, translateY: 0 };

describe('TurkeyMap zoom state', () => {
  it('does not change the default output when zoomable is omitted', () => {
    const { container } = render(<TurkeyMap data={testData} />);
    const svg = getSvg(container);

    expect(getProvinceGroupTransform(container)).toBeNull();
    expect(svg).not.toHaveAttribute('tabindex');
    expect(svg.querySelector('.tm-zoom-controls')).toBeNull();
  });

  it('renders the initial transform and viewport tab stop when zoomable', () => {
    const { container } = render(<TurkeyMap data={testData} zoomable />);
    const svg = getSvg(container);

    expect(parseTransform(getProvinceGroupTransform(container))).toEqual(initialViewport);
    expect(svg).toHaveAttribute('tabindex', '0');
    expect(svg.getAttribute('aria-label')).toContain('zoomable');
    expect(container.querySelector('.tm-zoom-controls')).toBeNull();
  });

  it('does not emit a viewport change on mount', () => {
    const onViewportChange = jest.fn();

    render(
      <TurkeyMap
        data={testData}
        zoomable
        viewport={{ scale: 2, translateX: -605, translateY: -292.5 }}
        onViewportChange={onViewportChange}
      />,
    );

    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('updates uncontrolled viewport state and reports it', () => {
    const onViewportChange = jest.fn();
    const { container } = render(
      <TurkeyMap data={testData} zoomable onViewportChange={onViewportChange} />,
    );
    const svg = getSvg(container);
    mockSvgRect(svg);

    act(() => {
      dispatchWheel(svg, { clientX: 525, clientY: 292.5, deltaY: -100 });
    });

    expect(onViewportChange).toHaveBeenCalledTimes(1);
    const viewport = onViewportChange.mock.calls[0][0] as Viewport;
    expect(viewport.scale).toBeGreaterThan(1);
    expect(parseTransform(getProvinceGroupTransform(container))?.scale).toBeCloseTo(viewport.scale);
  });

  it('keeps the uncontrolled viewport across unrelated rerenders', () => {
    const { container, rerender } = render(<TurkeyMap data={testData} zoomable />);
    const ref = React.createRef<TurkeyMapRef>();
    rerender(<TurkeyMap ref={ref} data={testData} zoomable />);

    act(() => {
      ref.current?.zoomTo(3);
    });
    const zoomed = getProvinceGroupTransform(container);

    rerender(<TurkeyMap ref={ref} data={testData} zoomable />);

    expect(getProvinceGroupTransform(container)).toBe(zoomed);
  });

  it('does not report a viewport change for an identical value', () => {
    const onViewportChange = jest.fn();
    const ref = React.createRef<TurkeyMapRef>();
    render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        onViewportChange={onViewportChange}
      />,
    );

    act(() => {
      ref.current?.zoomTo(1);
    });

    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('follows a controlled viewport and reports gestures without replacing it', () => {
    const onViewportChange = jest.fn();
    const { container, rerender } = render(
      <TurkeyMap
        data={testData}
        zoomable
        viewport={{ scale: 2, translateX: -605, translateY: -292.5 }}
        onViewportChange={onViewportChange}
      />,
    );
    const svg = getSvg(container);
    mockSvgRect(svg);

    expect(parseTransform(getProvinceGroupTransform(container))).toEqual({
      scale: 2,
      translateX: -605,
      translateY: -292.5,
    });

    act(() => {
      dispatchWheel(svg, { clientX: 525, clientY: 292.5, deltaY: -100 });
    });

    expect(onViewportChange).toHaveBeenCalledTimes(1);
    expect(parseTransform(getProvinceGroupTransform(container))).toEqual({
      scale: 2,
      translateX: -605,
      translateY: -292.5,
    });

    rerender(
      <TurkeyMap
        data={testData}
        zoomable
        viewport={onViewportChange.mock.calls[0][0] as Viewport}
        onViewportChange={onViewportChange}
      />,
    );

    expect(parseTransform(getProvinceGroupTransform(container))?.scale)
      .toBeCloseTo((onViewportChange.mock.calls[0][0] as Viewport).scale);
  });

  it('normalizes invalid controlled values', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        zoomable
        viewport={{ scale: 2, translateX: NaN, translateY: Infinity }}
      />,
    );

    expect(parseTransform(getProvinceGroupTransform(container))).toEqual({
      scale: 2,
      translateX: -605,
      translateY: -292.5,
    });
  });

  it('normalizes out-of-range controlled values', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        zoomable
        viewport={{ scale: 200, translateX: 1000, translateY: -100000 }}
      />,
    );

    const viewport = parseTransform(getProvinceGroupTransform(container));
    expect(viewport?.scale).toBe(8);
    expect(viewport?.translateX).toBe(80 * (1 - 8));
    expect(viewport?.translateY).toBe(585 * (1 - 8));
  });

  it('warns and ignores zoom props without zoomable', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { container } = render(
      <TurkeyMap
        data={testData}
        minZoom={2}
        maxZoom={4}
        zoomControls
        viewport={{ scale: 2, translateX: -605, translateY: -292.5 }}
        onViewportChange={jest.fn()}
      />,
    );

    expect(getProvinceGroupTransform(container)).toBeNull();
    expect(container.querySelector('.tm-zoom-controls')).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('require zoomable={true}'));
    warn.mockRestore();
  });

  it('warns about invalid zoom bounds', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(<TurkeyMap data={testData} zoomable minZoom={0} maxZoom={Infinity} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('minZoom must be'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('maxZoom must be'));

    warn.mockClear();
    render(<TurkeyMap data={testData} zoomable minZoom={4} maxZoom={2} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('maxZoom must be greater'));

    warn.mockRestore();
  });
});

describe('TurkeyMap zoom ref API', () => {
  it('focuses and zooms to a province', () => {
    const onViewportChange = jest.fn();
    const ref = React.createRef<TurkeyMapRef>();
    const { container } = render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        onViewportChange={onViewportChange}
      />,
    );
    const alpha = getCityGroup(container, 'Alpha');
    mockCityBBox(alpha, { x: 500, y: 200, width: 100, height: 100 });

    act(() => {
      ref.current?.focusCity('alpha');
    });

    expect(onViewportChange).toHaveBeenCalledWith({
      scale: 2,
      translateX: -495,
      translateY: -207.5,
    });
    expect(parseTransform(getProvinceGroupTransform(container))).toEqual({
      scale: 2,
      translateX: -495,
      translateY: -207.5,
    });
  });

  it('accepts an explicit focus zoom and clamps it', () => {
    const onViewportChange = jest.fn();
    const ref = React.createRef<TurkeyMapRef>();
    const { container } = render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        onViewportChange={onViewportChange}
      />,
    );
    mockCityBBox(getCityGroup(container, 'Alpha'), {
      x: 500,
      y: 200,
      width: 100,
      height: 100,
    });

    act(() => {
      ref.current?.focusCity('alpha', 5);
    });
    expect((onViewportChange.mock.calls[0][0] as Viewport).scale).toBe(5);

    onViewportChange.mockClear();
    act(() => {
      ref.current?.focusCity('alpha', 100);
    });
    expect((onViewportChange.mock.calls[0][0] as Viewport).scale).toBe(8);
  });

  it('focuses a disabled province without selecting it', () => {
    const onViewportChange = jest.fn();
    const onSelectionChange = jest.fn();
    const ref = React.createRef<TurkeyMapRef>();
    const disabledData = {
      cities: [
        { ...testData.cities[0], disabled: true },
        testData.cities[1],
      ],
    };
    const { container } = render(
      <TurkeyMap
        ref={ref}
        data={disabledData}
        zoomable
        selectionMode="single"
        onViewportChange={onViewportChange}
        onSelectionChange={onSelectionChange}
      />,
    );
    mockCityBBox(getCityGroup(container, 'Alpha'), {
      x: 500,
      y: 200,
      width: 100,
      height: 100,
    });

    act(() => {
      ref.current?.focusCity('alpha');
    });

    expect(onViewportChange).toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('warns and does nothing for an unknown city', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onViewportChange = jest.fn();
    const ref = React.createRef<TurkeyMapRef>();
    render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        onViewportChange={onViewportChange}
      />,
    );

    act(() => {
      ref.current?.focusCity('missing');
    });

    expect(onViewportChange).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not find a city'));
    warn.mockRestore();
  });

  it('warns and does nothing when a city cannot be measured', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onViewportChange = jest.fn();
    const ref = React.createRef<TurkeyMapRef>();
    const { container } = render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        onViewportChange={onViewportChange}
      />,
    );
    mockCityBBox(getCityGroup(container, 'Alpha'), { width: 0, height: 0 });

    act(() => {
      ref.current?.focusCity('alpha');
    });

    expect(onViewportChange).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not measure'));
    warn.mockRestore();
  });

  it('does nothing when getBBox throws', () => {
    const onViewportChange = jest.fn();
    const ref = React.createRef<TurkeyMapRef>();
    const { container } = render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        onViewportChange={onViewportChange}
      />,
    );
    const alpha = getCityGroup(container, 'Alpha');
    Object.defineProperty(alpha, 'getBBox', {
      configurable: true,
      value: () => {
        throw new Error('measurement failed');
      },
    });

    expect(() => {
      act(() => {
        ref.current?.focusCity('alpha');
      });
    }).not.toThrow();
    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('does nothing when layout measurement is unavailable', () => {
    const onViewportChange = jest.fn();
    const ref = React.createRef<TurkeyMapRef>();
    render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        onViewportChange={onViewportChange}
      />,
    );

    expect(() => ref.current?.focusCity('alpha')).not.toThrow();
    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('zooms to absolute scales, clamps, and resets', () => {
    const onViewportChange = jest.fn();
    const ref = React.createRef<TurkeyMapRef>();
    const { container } = render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        onViewportChange={onViewportChange}
      />,
    );

    act(() => {
      ref.current?.zoomTo(2);
    });
    expect(parseTransform(getProvinceGroupTransform(container))?.scale).toBe(2);

    onViewportChange.mockClear();
    act(() => {
      ref.current?.zoomTo(6);
    });
    expect((onViewportChange.mock.calls[0][0] as Viewport).scale).toBe(6);

    onViewportChange.mockClear();
    act(() => {
      ref.current?.zoomTo(0);
    });
    expect((onViewportChange.mock.calls[0][0] as Viewport).scale).toBe(1);

    act(() => {
      ref.current?.zoomTo(6);
    });
    onViewportChange.mockClear();
    act(() => {
      ref.current?.resetView();
    });
    expect(onViewportChange).toHaveBeenCalledWith(initialViewport);
  });

  it('reports normalized values without replacing a controlled viewport', () => {
    const onViewportChange = jest.fn();
    const ref = React.createRef<TurkeyMapRef>();
    const { container } = render(
      <TurkeyMap
        ref={ref}
        data={testData}
        zoomable
        viewport={{ scale: 2, translateX: -605, translateY: -292.5 }}
        onViewportChange={onViewportChange}
      />,
    );

    act(() => {
      ref.current?.zoomTo(4);
    });

    expect((onViewportChange.mock.calls[0][0] as Viewport).scale).toBe(4);
    expect(parseTransform(getProvinceGroupTransform(container))?.scale).toBe(2);
  });

  it('does nothing without zoomable', () => {
    const onViewportChange = jest.fn();
    const ref = React.createRef<TurkeyMapRef>();
    render(
      <TurkeyMap
        ref={ref}
        data={testData}
        onViewportChange={onViewportChange}
      />,
    );

    act(() => {
      ref.current?.focusCity('alpha');
      ref.current?.zoomTo(2);
      ref.current?.resetView();
    });

    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('is safe after unmount', () => {
    const ref = React.createRef<TurkeyMapRef>();
    const { unmount } = render(<TurkeyMap ref={ref} data={testData} zoomable />);

    unmount();

    expect(() => {
      ref.current?.focusCity('alpha');
      ref.current?.zoomTo(2);
      ref.current?.resetView();
    }).not.toThrow();
  });

  it('does not zoom on wheel when the SVG has no measurable rect', () => {
    const onViewportChange = jest.fn();
    const { container } = render(
      <TurkeyMap data={testData} zoomable onViewportChange={onViewportChange} />,
    );
    const svg = getSvg(container);

    dispatchWheel(svg, { clientX: 0, clientY: 0, deltaY: -100 });

    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('removes the wheel listener when zoomable is disabled', () => {
    const onViewportChange = jest.fn();
    const { container, rerender } = render(
      <TurkeyMap data={testData} zoomable onViewportChange={onViewportChange} />,
    );
    const svg = getSvg(container);
    mockSvgRect(svg);

    rerender(<TurkeyMap data={testData} onViewportChange={onViewportChange} />);
    fireEvent.wheel(svg, { clientX: 525, clientY: 292.5, deltaY: -100 });

    expect(onViewportChange).not.toHaveBeenCalled();
  });
});
