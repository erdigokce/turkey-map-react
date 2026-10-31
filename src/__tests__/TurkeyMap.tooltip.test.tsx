import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import { testData } from '../../tests/fixtures/cities';
import { getCityGroup, getCityPath, getTooltip } from '../../tests/helpers';

describe('TurkeyMap tooltip', () => {
  it('does not render the tooltip or keyframes when showTooltip is false', () => {
    const { container } = render(<TurkeyMap data={testData} />);

    expect(container.querySelector('#svg-turkiye-haritasi-container-tooltip')).toBeNull();
    expect(container.querySelector('style')).toBeNull();
  });

  it('renders a hidden, empty tooltip when showTooltip is true', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = getTooltip(container);

    expect(tooltip).toBeEmptyDOMElement();
    expect(tooltip).toHaveStyle({
      left: '0px',
      top: '0px',
      visibility: 'hidden',
    });
  });

  it('shows the hovered city name', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);

    fireEvent.mouseOver(getCityPath(getCityGroup(container, 'Alpha')));

    expect(getTooltip(container)).toHaveTextContent('Alpha');
  });

  it('updates the tooltip text when hovering a different city', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);

    fireEvent.mouseOver(getCityPath(getCityGroup(container, 'Alpha')));
    expect(getTooltip(container)).toHaveTextContent('Alpha');

    fireEvent.mouseOver(getCityPath(getCityGroup(container, 'Beta')));
    expect(getTooltip(container)).toHaveTextContent('Beta');
  });

  it('prefers tooltipText over the hovered city name', () => {
    const { container } = render(
      <TurkeyMap data={testData} showTooltip={true} tooltipText="Custom text" />,
    );

    fireEvent.mouseOver(getCityPath(getCityGroup(container, 'Alpha')));

    expect(getTooltip(container)).toHaveTextContent('Custom text');
    expect(getTooltip(container)).not.toHaveTextContent('Alpha');
  });

  it('shows the tooltip on mouse enter', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = getTooltip(container);

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));

    expect(tooltip).toHaveStyle({ visibility: 'visible' });
  });

  it('tracks the pointer position on mouse move', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = getTooltip(container);

    fireEvent.mouseMove(getCityGroup(container, 'Alpha'), {
      clientX: 100,
      clientY: 200,
    });

    expect(tooltip).toHaveStyle({ left: '116px', top: '168px' });
  });

  it('applies the fade-out animation on mouse leave', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const group = getCityGroup(container, 'Alpha');
    const tooltip = getTooltip(container);

    fireEvent.mouseEnter(group);
    fireEvent.mouseLeave(group);

    expect(tooltip.style.animation).toContain('turkey_react_map_tooltip_fade_out');
    expect(tooltip.style.visibility).toBe('');
  });

  it('clears the fade-out animation when the pointer re-enters', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const group = getCityGroup(container, 'Alpha');
    const tooltip = getTooltip(container);

    fireEvent.mouseEnter(group);
    fireEvent.mouseLeave(group);
    fireEvent.mouseEnter(group);

    expect(tooltip.style.animation).toBe('');
    expect(tooltip).toHaveStyle({ visibility: 'visible' });
  });

  it('renders the fade-out keyframes when showTooltip is true', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const style = container.querySelector('style');

    expect(style).toBeInTheDocument();
    expect(style).toHaveTextContent('@keyframes turkey_react_map_tooltip_fade_out');
  });
});
