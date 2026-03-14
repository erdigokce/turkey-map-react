import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tooltip from '../Tooltip';

describe('Tooltip Component', () => {
  const getTooltip = (container: HTMLElement) => (
    container.querySelector('#svg-turkiye-haritasi-container-tooltip') as HTMLDivElement
  );

  it('should render without crashing', () => {
    const { container } = render(<Tooltip />);
    const tooltip = getTooltip(container);
    expect(tooltip).toBeInTheDocument();
  });

  it('should display the provided text', () => {
    const testText = 'Test Tooltip Text';
    const { container } = render(<Tooltip text={testText} />);
    const tooltip = getTooltip(container);
    expect(tooltip).toHaveTextContent(testText);
  });

  it('should apply default styles', () => {
    const { container } = render(<Tooltip />);
    const tooltip = getTooltip(container);
    expect(tooltip.style.width).toBe('120px');
    expect(tooltip.style.backgroundColor).toBe('black');
    expect(tooltip.style.color).toBe('white');
    expect(tooltip.style.textAlign).toBe('center');
    expect(tooltip.style.padding).toBe('5px 0px');
    expect(tooltip.style.borderRadius).toBe('6px');
    expect(tooltip.style.position).toBe('absolute');
    expect(tooltip.style.zIndex).toBe('1');
  });

  it('should apply custom styles', () => {
    const customStyle = {
      left: 100,
      top: 200,
      visibility: 'visible' as const
    };
    const { container } = render(<Tooltip style={customStyle} />);
    const tooltip = getTooltip(container);
    expect(tooltip).toHaveStyle({
      left: '100px',
      top: '200px',
      visibility: 'visible'
    });
  });

  it('should merge custom styles with default styles', () => {
    const customStyle = {
      left: 50,
      top: 100
    };
    const { container } = render(<Tooltip text="Test" style={customStyle} />);
    const tooltip = getTooltip(container);
    expect(tooltip.style.left).toBe('50px');
    expect(tooltip.style.top).toBe('100px');
    expect(tooltip.style.backgroundColor).toBe('black');
    expect(tooltip.style.color).toBe('white');
  });

  it('should handle undefined text gracefully', () => {
    const { container } = render(<Tooltip text={undefined} />);
    const tooltip = getTooltip(container);
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toBeEmptyDOMElement();
  });
});
