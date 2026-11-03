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

  it('prefers children over text', () => {
    const { container } = render(
      <Tooltip text="Fallback">
        <strong>Custom content</strong>
      </Tooltip>,
    );
    const tooltip = getTooltip(container);

    expect(tooltip).toHaveTextContent('Custom content');
    expect(tooltip).not.toHaveTextContent('Fallback');
  });

  it('renders an empty container for null or false children', () => {
    const { container, rerender } = render(<Tooltip text="Fallback">{null}</Tooltip>);

    expect(getTooltip(container)).toBeEmptyDOMElement();

    rerender(<Tooltip text="Fallback">{false}</Tooltip>);

    expect(getTooltip(container)).toBeEmptyDOMElement();
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
    expect(tooltip.style.pointerEvents).toBe('none');
  });

  it('exposes tooltip semantics and hides itself while invisible', () => {
    const { container, rerender } = render(<Tooltip text="Hidden" />);
    const tooltip = getTooltip(container);

    expect(tooltip).toHaveAttribute('role', 'tooltip');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    expect(tooltip).not.toHaveAttribute('tabindex');

    rerender(<Tooltip text="Visible" visible={true} />);

    expect(tooltip).not.toHaveAttribute('aria-hidden');
  });

  it('supports a custom id for instance-scoped maps', () => {
    const { container } = render(<Tooltip id="checkout-tooltip" text="Scoped" />);
    const tooltip = container.querySelector('#checkout-tooltip');

    expect(tooltip).toBeInTheDocument();
    expect(container.querySelector('#svg-turkiye-haritasi-container-tooltip')).toBeNull();
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

  it('merges positioning, width, and wrapping styles with the defaults', () => {
    const { container } = render(
      <Tooltip
        style={{
          left: 10,
          top: 20,
          position: 'fixed',
          transform: 'translate(-50%, -100%)',
          width: 'auto',
          maxWidth: 320,
          whiteSpace: 'normal',
        }}
      />,
    );
    const tooltip = getTooltip(container);

    expect(tooltip.style.left).toBe('10px');
    expect(tooltip.style.top).toBe('20px');
    expect(tooltip.style.position).toBe('fixed');
    expect(tooltip.style.transform).toBe('translate(-50%, -100%)');
    expect(tooltip.style.width).toBe('auto');
    expect(tooltip.style.maxWidth).toBe('320px');
    expect(tooltip.style.whiteSpace).toBe('normal');
    expect(tooltip.style.backgroundColor).toBe('black');
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
