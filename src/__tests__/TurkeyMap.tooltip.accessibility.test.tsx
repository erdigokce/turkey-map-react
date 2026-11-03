import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import { testData } from '../../tests/fixtures/cities';
import { getCityGroup, getTooltip } from '../../tests/helpers';
import { advanceTimers, mockCityBounds } from '../../tests/tooltip-helpers';

describe('TurkeyMap tooltip accessibility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the tooltip immediately when a province receives keyboard focus', () => {
    const { container } = render(
      <TurkeyMap data={testData} showTooltip={true} selectionMode="single" />,
    );
    const tooltip = getTooltip(container);
    const group = getCityGroup(container, 'Alpha');
    mockCityBounds(group, { left: 100, top: 200, width: 50, height: 40 });

    fireEvent.focus(group);

    expect(tooltip).toHaveTextContent('Alpha');
    expect(tooltip).toHaveStyle({
      visibility: 'visible',
      left: '125px',
      top: '184px',
      transform: 'translate(-50%, -100%)',
    });
    expect(tooltip).not.toHaveAttribute('aria-hidden');
  });

  it('anchors the focused province even in cursor positioning mode', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        showTooltip={true}
        selectionMode="multiple"
        tooltipPosition="cursor"
      />,
    );
    const tooltip = getTooltip(container);
    const group = getCityGroup(container, 'Beta');
    mockCityBounds(group, { left: 300, top: 100, width: 60, height: 20 });

    fireEvent.focus(group);
    advanceTimers(100);

    expect(tooltip).toHaveTextContent('Beta');
    expect(tooltip).toHaveStyle({ left: '330px', top: '84px' });
  });

  it('hides after blur when nothing else is active', () => {
    const { container } = render(
      <TurkeyMap data={testData} showTooltip={true} selectionMode="single" />,
    );
    const tooltip = getTooltip(container);
    const group = getCityGroup(container, 'Alpha');

    fireEvent.focus(group);
    expect(tooltip).toHaveStyle({ visibility: 'visible' });

    fireEvent.blur(group);
    advanceTimers(80);

    expect(tooltip).toHaveStyle({ visibility: 'hidden' });
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });

  it('returns to the hovered province when blur leaves another province focused', () => {
    const { container } = render(
      <TurkeyMap data={testData} showTooltip={true} selectionMode="single" />,
    );
    const tooltip = getTooltip(container);
    const alphaGroup = getCityGroup(container, 'Alpha');
    const betaGroup = getCityGroup(container, 'Beta');
    mockCityBounds(alphaGroup, { left: 100, top: 200, width: 50, height: 40 });

    fireEvent.mouseEnter(betaGroup, { clientX: 400, clientY: 300 });
    advanceTimers(80);
    expect(tooltip).toHaveTextContent('Beta');

    fireEvent.focus(alphaGroup);
    expect(tooltip).toHaveTextContent('Alpha');

    fireEvent.blur(alphaGroup);

    expect(tooltip).toHaveTextContent('Beta');
    expect(tooltip).toHaveStyle({ visibility: 'visible' });
  });

  it('keeps a focused province tooltip when the pointer leaves another province', () => {
    const { container } = render(
      <TurkeyMap data={testData} showTooltip={true} selectionMode="single" />,
    );
    const tooltip = getTooltip(container);
    const alphaGroup = getCityGroup(container, 'Alpha');
    const betaGroup = getCityGroup(container, 'Beta');
    mockCityBounds(alphaGroup, { left: 100, top: 200, width: 50, height: 40 });

    fireEvent.focus(alphaGroup);
    expect(tooltip).toHaveTextContent('Alpha');

    fireEvent.mouseEnter(betaGroup, { clientX: 400, clientY: 300 });
    expect(tooltip).toHaveTextContent('Beta');

    fireEvent.mouseLeave(betaGroup);
    advanceTimers(80);

    expect(tooltip).toHaveTextContent('Alpha');
    expect(tooltip).toHaveStyle({ visibility: 'visible', left: '125px', top: '184px' });
  });

  it('returns to city anchoring for a hovered province on blur in city mode', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        showTooltip={true}
        selectionMode="single"
        tooltipPosition="city"
      />,
    );
    const tooltip = getTooltip(container);
    const alphaGroup = getCityGroup(container, 'Alpha');
    const betaGroup = getCityGroup(container, 'Beta');
    mockCityBounds(alphaGroup, { left: 100, top: 200, width: 50, height: 40 });
    mockCityBounds(betaGroup, { left: 300, top: 100, width: 60, height: 20 });

    fireEvent.mouseEnter(betaGroup);
    advanceTimers(80);
    fireEvent.focus(alphaGroup);
    expect(tooltip).toHaveTextContent('Alpha');

    fireEvent.blur(alphaGroup);

    expect(tooltip).toHaveTextContent('Beta');
    expect(tooltip).toHaveStyle({ left: '330px', top: '84px' });
  });

  it('uses a roving tab stop in selectionMode="none"', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = getTooltip(container);

    expect(getCityGroup(container, 'Alpha')).toHaveAttribute('tabindex', '0');
    expect(getCityGroup(container, 'Beta')).toHaveAttribute('tabindex', '-1');
    expect(tooltip).not.toHaveAttribute('tabindex');
  });

  it('reveals a tooltip from focus events in none mode', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = getTooltip(container);
    const group = getCityGroup(container, 'Alpha');
    mockCityBounds(group, { left: 100, top: 200, width: 50, height: 40 });

    fireEvent.focus(group);

    expect(tooltip).toHaveTextContent('Alpha');
    expect(tooltip).toHaveStyle({ visibility: 'visible' });
  });

  it('exposes role and aria-hidden transitions on the tooltip shell', () => {
    const { container } = render(
      <TurkeyMap data={testData} showTooltip={true} selectionMode="single" />,
    );
    const tooltip = getTooltip(container);
    const group = getCityGroup(container, 'Alpha');

    expect(tooltip).toHaveAttribute('role', 'tooltip');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    expect(tooltip).not.toHaveAttribute('tabindex');

    fireEvent.focus(group);
    expect(tooltip).not.toHaveAttribute('aria-hidden');

    fireEvent.blur(group);
    advanceTimers(80);
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });
});
