import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tooltip from '../Tooltip';

describe('Tooltip Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<Tooltip />);
    const tooltip = container.querySelector('#svg-turkiye-haritasi-container-tooltip');
    expect(tooltip).toBeInTheDocument();
  });

  it('should display the provided text', () => {
    const testText = 'Test Tooltip Text';
    const { container } = render(<Tooltip text={testText} />);
    const tooltip = container.querySelector('#svg-turkiye-haritasi-container-tooltip');
    expect(tooltip).toHaveTextContent(testText);
  });

  it('should apply default styles', () => {
    const { container } = render(<Tooltip />);
    const tooltip = container.querySelector('#svg-turkiye-haritasi-container-tooltip');
    expect(tooltip).toHaveStyle({
      width: '120px',
      backgroundColor: 'black',
      color: 'white',
      textAlign: 'center',
      padding: '5px 0',
      borderRadius: '6px',
      position: 'absolute',
      zIndex: 1
    });
  });

  it('should apply custom styles', () => {
    const customStyle = {
      left: 100,
      top: 200,
      visibility: 'visible' as const
    };
    const { container } = render(<Tooltip style={customStyle} />);
    const tooltip = container.querySelector('#svg-turkiye-haritasi-container-tooltip');
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
    const tooltip = container.querySelector('#svg-turkiye-haritasi-container-tooltip');
    expect(tooltip).toHaveStyle({
      left: '50px',
      top: '100px',
      backgroundColor: 'black',
      color: 'white'
    });
  });

  it('should handle undefined text gracefully', () => {
    const { container } = render(<Tooltip text={undefined} />);
    const tooltip = container.querySelector('#svg-turkiye-haritasi-container-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toBeEmptyDOMElement();
  });
});
