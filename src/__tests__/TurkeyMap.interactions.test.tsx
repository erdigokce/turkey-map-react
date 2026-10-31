import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import { alpha, testCities, testData } from '../../tests/fixtures/cities';
import { getCityGroup, getCityPath } from '../../tests/helpers';

describe('TurkeyMap interactions', () => {
  it('calls onHover with the exact city payload', () => {
    const onHover = jest.fn();
    const { container } = render(<TurkeyMap data={testData} onHover={onHover} />);

    fireEvent.mouseOver(getCityPath(getCityGroup(container, 'Alpha')));

    expect(onHover).toHaveBeenCalledTimes(1);
    expect(onHover).toHaveBeenCalledWith(testCities[0]);
  });

  it('calls onClick with the exact city payload', () => {
    const onClick = jest.fn();
    const { container } = render(<TurkeyMap data={testData} onClick={onClick} />);

    fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(testCities[0]);
  });

  it('ignores events whose target is not a city path', () => {
    const onHover = jest.fn();
    const onClick = jest.fn();
    const { container } = render(
      <TurkeyMap data={testData} onHover={onHover} onClick={onClick} />,
    );

    const group = getCityGroup(container, 'Alpha');
    fireEvent.mouseOver(group);
    fireEvent.click(group);

    expect(onHover).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not call onHover when hoverable is false but still calls onClick', () => {
    const onHover = jest.fn();
    const onClick = jest.fn();
    const { container } = render(
      <TurkeyMap data={testData} hoverable={false} onHover={onHover} onClick={onClick} />,
    );

    const path = getCityPath(getCityGroup(container, 'Alpha'));
    fireEvent.mouseOver(path);
    fireEvent.click(path);

    expect(onHover).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(alpha);
  });

  it('does not throw when no callbacks are supplied', () => {
    const { container } = render(<TurkeyMap data={testData} />);
    const group = getCityGroup(container, 'Alpha');
    const path = getCityPath(group);

    expect(() => {
      fireEvent.mouseEnter(group);
      fireEvent.mouseOver(path);
      fireEvent.mouseLeave(group);
      fireEvent.click(path);
    }).not.toThrow();
  });

  it('uses the latest callbacks after a rerender', () => {
    const firstOnClick = jest.fn();
    const secondOnClick = jest.fn();
    const { container, rerender } = render(
      <TurkeyMap data={testData} onClick={firstOnClick} />,
    );

    fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
    expect(firstOnClick).toHaveBeenCalledTimes(1);

    rerender(<TurkeyMap data={testData} onClick={secondOnClick} />);
    fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));

    expect(secondOnClick).toHaveBeenCalledTimes(1);
    expect(firstOnClick).toHaveBeenCalledTimes(1);
  });

  it('uses the latest onHover callback after a rerender', () => {
    const firstOnHover = jest.fn();
    const secondOnHover = jest.fn();
    const { container, rerender } = render(
      <TurkeyMap data={testData} onHover={firstOnHover} />,
    );

    fireEvent.mouseOver(getCityPath(getCityGroup(container, 'Alpha')));
    expect(firstOnHover).toHaveBeenCalledTimes(1);

    rerender(<TurkeyMap data={testData} onHover={secondOnHover} />);
    fireEvent.mouseOver(getCityPath(getCityGroup(container, 'Alpha')));

    expect(secondOnHover).toHaveBeenCalledTimes(1);
    expect(firstOnHover).toHaveBeenCalledTimes(1);
  });

  it('changes the path fill on hover and restores it on leave', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        customStyle={{ idleColor: '#111111', hoverColor: '#222222' }}
      />,
    );

    const group = getCityGroup(container, 'Alpha');
    const path = getCityPath(group);

    expect(path.style.fill).toBe('#111111');

    fireEvent.mouseEnter(group);
    expect(path.style.fill).toBe('#222222');

    fireEvent.mouseLeave(group);
    expect(path.style.fill).toBe('#111111');
  });
});
