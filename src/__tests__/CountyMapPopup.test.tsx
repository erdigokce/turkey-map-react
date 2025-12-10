import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CountyMapPopup, { CountyData } from '../CountyMapPopup';

describe('CountyMapPopup Component', () => {
  const mockCountyData: CountyData = {
    cityId: "test-city",
    cityName: "Test City",
    counties: [
      { id: "county1", name: "County 1", path: "M 0 0 L 100 0 L 100 100 L 0 100 Z" },
      { id: "county2", name: "County 2", path: "M 100 0 L 200 0 L 200 100 L 100 100 Z" }
    ]
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <CountyMapPopup countyData={mockCountyData} onClose={mockOnClose} />
      );
      
      expect(container.querySelector('#county-map-container')).toBeInTheDocument();
    });

    it('should display city name in header', () => {
      render(<CountyMapPopup countyData={mockCountyData} onClose={mockOnClose} />);
      
      expect(screen.getByText(/Test City - İlçeler/i)).toBeInTheDocument();
    });

    it('should render all counties', () => {
      const { container } = render(
        <CountyMapPopup countyData={mockCountyData} onClose={mockOnClose} />
      );
      
      const countyGroups = container.querySelectorAll('g[data-ilceadi]');
      expect(countyGroups.length).toBe(2);
    });

    it('should have close button', () => {
      render(<CountyMapPopup countyData={mockCountyData} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText('Close county map');
      expect(closeButton).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      const { container } = render(
        <CountyMapPopup countyData={mockCountyData} onClose={mockOnClose} />
      );
      
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'county-map-title');
      
      const title = container.querySelector('#county-map-title');
      expect(title).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should call onClose when close button is clicked', () => {
      render(<CountyMapPopup countyData={mockCountyData} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText('Close county map');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when ESC key is pressed', () => {
      render(<CountyMapPopup countyData={mockCountyData} onClose={mockOnClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay is clicked', () => {
      const { container } = render(
        <CountyMapPopup countyData={mockCountyData} onClose={mockOnClose} />
      );
      
      const overlay = container.firstChild as HTMLElement;
      fireEvent.click(overlay);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when popup content is clicked', () => {
      const { container } = render(
        <CountyMapPopup countyData={mockCountyData} onClose={mockOnClose} />
      );
      
      const popupContent = container.querySelector('#county-map-container') as HTMLElement;
      fireEvent.click(popupContent);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onCountyClick when a county is clicked', () => {
      const onCountyClick = jest.fn();
      const { container } = render(
        <CountyMapPopup 
          countyData={mockCountyData} 
          onClose={mockOnClose}
          onCountyClick={onCountyClick}
        />
      );
      
      const firstPath = container.querySelector('path');
      if (firstPath) {
        fireEvent.click(firstPath);
        expect(onCountyClick).toHaveBeenCalled();
        const countyArg = onCountyClick.mock.calls[0][0];
        expect(countyArg).toHaveProperty('id');
        expect(countyArg).toHaveProperty('name');
        expect(countyArg).toHaveProperty('path');
      }
    });

    it('should call onCountyHover when hovering over a county', () => {
      const onCountyHover = jest.fn();
      const { container } = render(
        <CountyMapPopup 
          countyData={mockCountyData} 
          onClose={mockOnClose}
          onCountyHover={onCountyHover}
          hoverable={true}
        />
      );
      
      const firstPath = container.querySelector('path');
      if (firstPath && firstPath.parentElement) {
        fireEvent.mouseOver(firstPath);
        expect(onCountyHover).toHaveBeenCalled();
      }
    });
  });

  describe('Styling', () => {
    it('should apply custom idle color', () => {
      const customStyle = { idleColor: '#ff0000', hoverColor: '#00ff00' };
      const { container } = render(
        <CountyMapPopup 
          countyData={mockCountyData} 
          onClose={mockOnClose}
          customStyle={customStyle}
        />
      );
      
      const firstPath = container.querySelector('path');
      expect(firstPath).toHaveStyle({ fill: '#ff0000' });
    });

    it('should change fill color on mouse enter', () => {
      const customStyle = { idleColor: '#ff0000', hoverColor: '#00ff00' };
      const { container } = render(
        <CountyMapPopup 
          countyData={mockCountyData} 
          onClose={mockOnClose}
          customStyle={customStyle}
        />
      );
      
      const firstCountyGroup = container.querySelector('g[data-ilceadi]');
      const firstPath = container.querySelector('path') as SVGPathElement;
      
      if (firstCountyGroup && firstPath) {
        expect(firstPath.style.fill).toBe('#ff0000');
        fireEvent.mouseEnter(firstCountyGroup);
        expect(firstPath.style.fill).toBe('#00ff00');
      }
    });
  });

  describe('Tooltip Functionality', () => {
    it('should render tooltip when showTooltip is true', () => {
      const { container } = render(
        <CountyMapPopup 
          countyData={mockCountyData} 
          onClose={mockOnClose}
          showTooltip={true}
        />
      );
      
      const tooltip = container.querySelector('#county-map-tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('should not render tooltip when showTooltip is false', () => {
      const { container } = render(
        <CountyMapPopup 
          countyData={mockCountyData} 
          onClose={mockOnClose}
          showTooltip={false}
        />
      );
      
      const tooltip = container.querySelector('#county-map-tooltip');
      expect(tooltip).not.toBeInTheDocument();
    });
  });
});
