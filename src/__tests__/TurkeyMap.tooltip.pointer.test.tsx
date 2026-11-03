import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import { testData } from '../../tests/fixtures/cities';
import { getCityGroup, getCityPath, getTooltip } from '../../tests/helpers';
import {
  advanceTimers,
  installPointerEvent,
  mockCityBounds,
} from '../../tests/tooltip-helpers';

describe('TurkeyMap tooltip pointer interaction', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('with PointerEvent support', () => {
    let restorePointerEvent: () => void;

    beforeEach(() => {
      restorePointerEvent = installPointerEvent();
    });

    afterEach(() => {
      restorePointerEvent();
    });

    it.each(['mouse', 'touch', 'pen'])('reveals the tooltip for a %s pointer', (pointerType) => {
      const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
      const tooltip = getTooltip(container);
      const group = getCityGroup(container, 'Alpha');

      fireEvent.pointerEnter(group, { pointerType, clientX: 100, clientY: 200 });
      advanceTimers(80);

      expect(tooltip).toHaveTextContent('Alpha');
      expect(tooltip).toHaveStyle({ visibility: 'visible', left: '116px', top: '168px' });
    });

    it('tracks pointer movement', () => {
      const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
      const tooltip = getTooltip(container);
      const group = getCityGroup(container, 'Alpha');

      fireEvent.pointerEnter(group, { pointerType: 'pen', clientX: 10, clientY: 20 });
      advanceTimers(80);
      fireEvent.pointerMove(group, { pointerType: 'pen', clientX: 200, clientY: 300 });

      expect(tooltip).toHaveStyle({ left: '216px', top: '268px' });
    });

    it('hides after pointerleave', () => {
      const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
      const tooltip = getTooltip(container);
      const group = getCityGroup(container, 'Alpha');

      fireEvent.pointerEnter(group, { pointerType: 'mouse' });
      advanceTimers(80);
      fireEvent.pointerLeave(group, { pointerType: 'mouse' });
      advanceTimers(80);

      expect(tooltip).toHaveStyle({ visibility: 'hidden' });
      expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    });

    it('hides after pointercancel', () => {
      const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
      const tooltip = getTooltip(container);
      const group = getCityGroup(container, 'Alpha');

      fireEvent.pointerEnter(group, { pointerType: 'touch' });
      advanceTimers(80);
      fireEvent.pointerCancel(group, { pointerType: 'touch' });
      advanceTimers(80);

      expect(tooltip).toHaveStyle({ visibility: 'hidden' });
    });

    it('ignores compatibility mouse events so pointer interactions run once', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          showTooltip={true}
          tooltipPosition="city"
          customStyle={{ idleColor: '#111111', hoverColor: '#222222' }}
        />,
      );
      const group = getCityGroup(container, 'Alpha');
      const path = getCityPath(group);
      const bounds = mockCityBounds(group, { left: 100, top: 200, width: 50, height: 40 });

      fireEvent.mouseEnter(group);
      fireEvent.mouseMove(group, { clientX: 50, clientY: 50 });

      expect(path).toHaveStyle({ fill: '#111111' });
      expect(bounds).not.toHaveBeenCalled();

      fireEvent.pointerEnter(group, { pointerType: 'mouse' });

      expect(path).toHaveStyle({ fill: '#222222' });
      expect(bounds).toHaveBeenCalledTimes(1);

      fireEvent.mouseLeave(group);
      advanceTimers(80);

      expect(path).toHaveStyle({ fill: '#222222' });
      expect(getTooltip(container)).toHaveStyle({ visibility: 'visible' });
    });

    it('still reports onHover only through mouseover', () => {
      const onHover = jest.fn();
      const { container } = render(
        <TurkeyMap data={testData} showTooltip={true} onHover={onHover} />,
      );
      const group = getCityGroup(container, 'Alpha');

      fireEvent.pointerEnter(group, { pointerType: 'mouse' });
      expect(onHover).not.toHaveBeenCalled();

      fireEvent.mouseOver(getCityPath(group));
      expect(onHover).toHaveBeenCalledTimes(1);
    });
  });

  describe('without PointerEvent support', () => {
    it('runs the mouse fallback for enter, move, and leave', () => {
      const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
      const tooltip = getTooltip(container);
      const group = getCityGroup(container, 'Alpha');

      fireEvent.mouseEnter(group, { clientX: 100, clientY: 200 });
      advanceTimers(80);
      expect(tooltip).toHaveStyle({ visibility: 'visible', left: '116px', top: '168px' });

      fireEvent.mouseMove(group, { clientX: 150, clientY: 250 });
      expect(tooltip).toHaveStyle({ left: '166px', top: '218px' });

      fireEvent.mouseLeave(group);
      advanceTimers(80);
      expect(tooltip).toHaveStyle({ visibility: 'hidden' });
    });

    it('ignores pointer events when the API is unavailable', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          showTooltip={true}
          customStyle={{ idleColor: '#111111', hoverColor: '#222222' }}
        />,
      );
      const tooltip = getTooltip(container);
      const group = getCityGroup(container, 'Alpha');
      const path = getCityPath(group);

      fireEvent.pointerEnter(group, { pointerType: 'touch' });
      fireEvent.pointerMove(group, { pointerType: 'touch', clientX: 50, clientY: 50 });
      fireEvent.pointerLeave(group, { pointerType: 'touch' });
      advanceTimers(80);

      expect(path).toHaveStyle({ fill: '#111111' });
      expect(tooltip).toHaveStyle({ visibility: 'hidden' });

      fireEvent.mouseEnter(group);
      advanceTimers(80);
      expect(tooltip).toHaveStyle({ visibility: 'visible' });

      fireEvent.pointerCancel(group, { pointerType: 'touch' });
      advanceTimers(80);
      expect(tooltip).toHaveStyle({ visibility: 'visible' });
    });
  });
});
