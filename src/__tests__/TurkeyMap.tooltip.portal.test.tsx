import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import { testData } from '../../tests/fixtures/cities';
import { getCityGroup, getMapContainer } from '../../tests/helpers';
import { advanceTimers, mockCityBounds } from '../../tests/tooltip-helpers';

const tooltipId = 'svg-turkiye-haritasi-container-tooltip';

const getDocumentTooltip = (): HTMLElement => {
  const tooltip = document.getElementById(tooltipId);
  if (!tooltip) {
    throw new Error('Tooltip was not found in the document');
  }
  return tooltip;
};

describe('TurkeyMap tooltip portal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the tooltip into document.body to escape clipping ancestors', () => {
    const { container } = render(
      <div id="clipping-ancestor" style={{ overflow: 'hidden' }}>
        <TurkeyMap data={testData} showTooltip={true} tooltipPortal={true} />
      </div>,
    );
    const tooltip = getDocumentTooltip();

    expect(tooltip.parentElement).toBe(document.body);
    expect(container.querySelector(`#${tooltipId}`)).toBeNull();
    expect(tooltip.closest('#clipping-ancestor')).toBeNull();
  });

  it('keeps the legacy id available in portal mode', () => {
    render(<TurkeyMap data={testData} showTooltip={true} tooltipPortal={true} />);

    expect(document.getElementById(tooltipId)).toBeInTheDocument();
  });

  it('keeps inline mode inside the map container by default', () => {
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = getDocumentTooltip();

    expect(getMapContainer(container).contains(tooltip)).toBe(true);
    expect(tooltip.parentElement).not.toBe(document.body);
  });

  it('moves the tooltip inline again when tooltipPortal toggles off', () => {
    const { container, rerender } = render(
      <TurkeyMap data={testData} showTooltip={true} tooltipPortal={true} />,
    );

    expect(getDocumentTooltip().parentElement).toBe(document.body);

    rerender(<TurkeyMap data={testData} showTooltip={true} tooltipPortal={false} />);

    const tooltip = getDocumentTooltip();
    expect(getMapContainer(container).contains(tooltip)).toBe(true);
    expect(tooltip.parentElement).not.toBe(document.body);
  });

  it('ports the tooltip when tooltipPortal is enabled after mount', () => {
    const { rerender } = render(
      <TurkeyMap data={testData} showTooltip={true} tooltipPortal={false} />,
    );

    expect(getDocumentTooltip().parentElement).not.toBe(document.body);

    rerender(<TurkeyMap data={testData} showTooltip={true} tooltipPortal={true} />);

    expect(getDocumentTooltip().parentElement).toBe(document.body);
  });

  it('removes the portal on unmount', () => {
    const { unmount } = render(
      <TurkeyMap data={testData} showTooltip={true} tooltipPortal={true} />,
    );

    expect(document.getElementById(tooltipId)).toBeInTheDocument();

    unmount();

    expect(document.getElementById(tooltipId)).toBeNull();
  });

  it('suppresses the portal when visible is false', () => {
    const { container, rerender } = render(
      <TurkeyMap data={testData} showTooltip={true} tooltipPortal={true} visible={false} />,
    );

    const tooltip = getDocumentTooltip();
    expect(tooltip.parentElement).not.toBe(document.body);
    expect(getMapContainer(container)).toHaveAttribute('hidden');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');

    rerender(<TurkeyMap data={testData} showTooltip={true} tooltipPortal={true} visible={true} />);

    expect(getDocumentTooltip().parentElement).toBe(document.body);
  });

  it('uses client coordinates with fixed positioning in portal mode', () => {
    render(
      <TurkeyMap
        data={testData}
        showTooltip={true}
        tooltipPortal={true}
        tooltipOffset={8}
      />,
    );
    const tooltip = getDocumentTooltip();

    fireEvent.mouseEnter(getCityGroup(document.body, 'Alpha'), { clientX: 100, clientY: 200 });
    advanceTimers(80);

    expect(tooltip).toHaveStyle({
      position: 'fixed',
      left: '108px',
      top: '184px',
      visibility: 'visible',
    });
  });

  it('anchors to city bounds with fixed positioning in portal mode', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        showTooltip={true}
        tooltipPortal={true}
        tooltipPosition="city"
        tooltipOffset={10}
      />,
    );
    const group = getCityGroup(container, 'Alpha');
    mockCityBounds(group, { left: 100, top: 200, width: 50, height: 40 });
    const tooltip = getDocumentTooltip();

    fireEvent.mouseEnter(group);
    advanceTimers(80);

    expect(tooltip).toHaveStyle({
      position: 'fixed',
      left: '125px',
      top: '190px',
      transform: 'translate(-50%, -100%)',
    });
  });

  it('server renders portal-enabled tooltip markup', () => {
    const html = renderToStaticMarkup(
      <TurkeyMap
        data={testData}
        showTooltip={true}
        tooltipPortal={true}
        tooltipText="SSR portal tooltip"
      />,
    );

    expect(html).toContain('SSR portal tooltip');
    expect(html).toContain('role="tooltip"');
  });
});
