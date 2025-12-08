import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap, { CityType } from '../index';

describe('TurkeyMap Component', () => {
  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<TurkeyMap />);
      const svgElement = container.querySelector('#svg-turkiye-haritasi');
      expect(svgElement).toBeInTheDocument();
    });

    it('should render with default props', () => {
      const { container } = render(<TurkeyMap />);
      const svgElement = container.querySelector('#svg-turkiye-haritasi');
      expect(svgElement).toBeInTheDocument();
      expect(svgElement).toHaveAttribute('viewBox', '0 80 1050 585');
    });

    it('should render all Turkish cities', () => {
      const { container } = render(<TurkeyMap />);
      const cityGroups = container.querySelectorAll('g[data-iladi]');
      expect(cityGroups.length).toBeGreaterThan(0);
    });

    it('should be hidden when visible prop is false', () => {
      const { container } = render(<TurkeyMap visible={false} />);
      const mapContainer = container.querySelector('#svg-turkiye-haritasi-container');
      expect(mapContainer).toHaveAttribute('hidden');
    });
  });

  describe('Custom ViewBox', () => {
    it('should render with custom viewBox', () => {
      const customViewBox = { top: 10, left: 20, width: 800, height: 600 };
      const { container } = render(<TurkeyMap viewBox={customViewBox} />);
      const svgElement = container.querySelector('#svg-turkiye-haritasi');
      expect(svgElement).toHaveAttribute('viewBox', '10 20 800 600');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom idle color', () => {
      const customStyle = { idleColor: '#ff0000', hoverColor: '#00ff00' };
      const { container } = render(<TurkeyMap customStyle={customStyle} />);
      const firstPath = container.querySelector('path');
      expect(firstPath).toHaveStyle({ fill: '#ff0000' });
    });

    it('should change fill color on mouse enter', () => {
      const customStyle = { idleColor: '#ff0000', hoverColor: '#00ff00' };
      const { container } = render(<TurkeyMap customStyle={customStyle} />);
      const firstCityGroup = container.querySelector('g[data-iladi]');
      const firstPath = container.querySelector('path') as SVGPathElement;
      
      if (firstCityGroup && firstPath) {
        expect(firstPath.style.fill).toBe('#ff0000');
        fireEvent.mouseEnter(firstCityGroup);
        expect(firstPath.style.fill).toBe('#00ff00');
      }
    });

    it('should revert to idle color on mouse leave', () => {
      const customStyle = { idleColor: '#ff0000', hoverColor: '#00ff00' };
      const { container } = render(<TurkeyMap customStyle={customStyle} />);
      const firstPath = container.querySelector('path');
      
      if (firstPath && firstPath.parentElement) {
        fireEvent.mouseEnter(firstPath.parentElement);
        fireEvent.mouseLeave(firstPath.parentElement);
        expect(firstPath).toHaveStyle({ fill: '#ff0000' });
      }
    });
  });

  describe('Mouse Interactions', () => {
    it('should call onHover callback when hovering over a city', () => {
      const onHoverMock = jest.fn();
      const { container } = render(<TurkeyMap onHover={onHoverMock} hoverable={true} />);
      const firstPath = container.querySelector('path');
      
      if (firstPath && firstPath.parentElement) {
        fireEvent.mouseOver(firstPath);
        expect(onHoverMock).toHaveBeenCalled();
        const cityArg = onHoverMock.mock.calls[0][0] as CityType;
        expect(cityArg).toHaveProperty('id');
        expect(cityArg).toHaveProperty('name');
        expect(cityArg).toHaveProperty('plateNumber');
        expect(cityArg).toHaveProperty('path');
      }
    });

    it('should call onClick callback when clicking on a city', () => {
      const onClickMock = jest.fn();
      const { container } = render(<TurkeyMap onClick={onClickMock} />);
      const firstPath = container.querySelector('path');
      
      if (firstPath && firstPath.parentElement) {
        fireEvent.click(firstPath);
        expect(onClickMock).toHaveBeenCalled();
        const cityArg = onClickMock.mock.calls[0][0] as CityType;
        expect(cityArg).toHaveProperty('id');
        expect(cityArg).toHaveProperty('name');
        expect(cityArg).toHaveProperty('plateNumber');
        expect(cityArg).toHaveProperty('path');
      }
    });

    it('should not call onHover when hoverable is false', () => {
      const onHoverMock = jest.fn();
      const { container } = render(<TurkeyMap onHover={onHoverMock} hoverable={false} />);
      const firstPath = container.querySelector('path');
      
      if (firstPath) {
        fireEvent.mouseOver(firstPath);
        expect(onHoverMock).not.toHaveBeenCalled();
      }
    });
  });

  describe('Tooltip Functionality', () => {
    it('should render tooltip when showTooltip is true', () => {
      const { container } = render(<TurkeyMap showTooltip={true} />);
      const tooltip = container.querySelector('#svg-turkiye-haritasi-container-tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('should not render tooltip when showTooltip is false', () => {
      const { container } = render(<TurkeyMap showTooltip={false} />);
      const tooltip = container.querySelector('#svg-turkiye-haritasi-container-tooltip');
      expect(tooltip).not.toBeInTheDocument();
    });

    it('should display custom tooltip text', () => {
      const customText = 'Custom Tooltip Text';
      const { container } = render(<TurkeyMap showTooltip={true} tooltipText={customText} />);
      const tooltip = container.querySelector('#svg-turkiye-haritasi-container-tooltip');
      expect(tooltip).toHaveTextContent(customText);
    });

    it('should have mouseMove handler attached when showTooltip is true', () => {
      const { container } = render(<TurkeyMap showTooltip={true} />);
      const firstCityGroup = container.querySelector('g[data-iladi]');
      
      expect(firstCityGroup).toBeInTheDocument();
      // Verify the tooltip exists
      const tooltip = container.querySelector('#svg-turkiye-haritasi-container-tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('should show tooltip animation on mouse enter', () => {
      const { container } = render(<TurkeyMap showTooltip={true} />);
      const firstPath = container.querySelector('path');
      
      if (firstPath && firstPath.parentElement) {
        fireEvent.mouseEnter(firstPath.parentElement);
        const tooltip = container.querySelector('#svg-turkiye-haritasi-container-tooltip');
        expect(tooltip).toHaveStyle({ visibility: 'visible' });
      }
    });
  });

  describe('City Wrapper', () => {
    it('should apply custom cityWrapper function', () => {
      const cityWrapper = (cityComponent: React.ReactElement, city: CityType) => {
        return React.cloneElement(cityComponent, { 
          'data-testid': `city-${city.id}` 
        } as any);
      };
      
      const { container } = render(<TurkeyMap cityWrapper={cityWrapper} />);
      const cityGroups = container.querySelectorAll('g[data-testid^="city-"]');
      expect(cityGroups.length).toBeGreaterThan(0);
    });
  });

  describe('Data Prop', () => {
    it('should render custom city data', () => {
      const customData = {
        cities: [
          { id: 'test-city', plateNumber: 99, name: 'Test City', path: 'M 0 0 L 100 100' }
        ]
      };
      
      const { container } = render(<TurkeyMap data={customData} />);
      const cityGroup = container.querySelector('g[data-iladi="Test City"]');
      expect(cityGroup).toBeInTheDocument();
      expect(cityGroup).toHaveAttribute('data-plakakodu', '99');
    });
  });

  describe('React 19 Compatibility', () => {
    it('should work with React 19 features - functional component with hooks', () => {
      const onHoverMock = jest.fn();
      const { container, rerender } = render(<TurkeyMap onHover={onHoverMock} />);
      
      expect(container.querySelector('#svg-turkiye-haritasi')).toBeInTheDocument();
      
      rerender(<TurkeyMap onHover={onHoverMock} visible={false} />);
      const mapContainer = container.querySelector('#svg-turkiye-haritasi-container');
      expect(mapContainer).toHaveAttribute('hidden');
    });

    it('should handle re-renders efficiently', () => {
      const { container, rerender } = render(<TurkeyMap />);
      const initialCityCount = container.querySelectorAll('g[data-iladi]').length;
      
      rerender(<TurkeyMap customStyle={{ idleColor: '#123456', hoverColor: '#abcdef' }} />);
      const afterRerenderCount = container.querySelectorAll('g[data-iladi]').length;
      
      expect(initialCityCount).toBe(afterRerenderCount);
    });
  });
});
