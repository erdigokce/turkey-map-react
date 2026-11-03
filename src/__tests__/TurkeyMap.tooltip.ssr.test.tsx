/**
 * @jest-environment node
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TurkeyMap from '../index';
import { testData } from '../../tests/fixtures/cities';

describe('TurkeyMap tooltip server rendering', () => {
  it('renders a portal-enabled tooltip without document access', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');

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
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('id="svg-turkiye-haritasi-container-tooltip"');
  });

  it('renders custom tooltip content on the server', () => {
    const html = renderToStaticMarkup(
      <TurkeyMap
        data={testData}
        showTooltip={true}
        renderTooltip={(city) => `Server ${city.name}`}
      />,
    );

    expect(html).toContain('role="tooltip"');
  });
});
