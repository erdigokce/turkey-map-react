import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import { testData } from '../../tests/fixtures/cities';

describe('TurkeyMap zoom server rendering', () => {
  it('leaves default server markup unchanged', () => {
    const html = renderToStaticMarkup(<TurkeyMap data={testData} />);

    expect(html).not.toContain('transform=');
    expect(html).not.toContain('tm-zoom-controls');
    expect(html).not.toContain('zoomable. Use + and -');
  });

  it('renders the initial viewport and label when zoomable', () => {
    const html = renderToStaticMarkup(<TurkeyMap data={testData} zoomable />);

    expect(html).toContain('transform="translate(0 0) scale(1)"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('zoomable. Use + and - to zoom');
  });

  it('renders controls and a controlled viewport', () => {
    const html = renderToStaticMarkup(
      <TurkeyMap
        data={testData}
        zoomable
        zoomControls
        viewport={{ scale: 2, translateX: -605, translateY: -292.5 }}
      />,
    );

    expect(html).toContain('transform="translate(-605 -292.5) scale(2)"');
    expect(html).toContain('class="tm-zoom-controls"');
    expect(html).toContain('aria-label="Map zoom controls"');
    expect(html).toContain('aria-label="Zoom in"');
    expect(html).toContain('aria-label="Zoom out"');
    expect(html).toContain('aria-label="Reset view"');
  });

  it('disables bounds-aware controls in the initial viewport', () => {
    const html = renderToStaticMarkup(
      <TurkeyMap data={testData} zoomable zoomControls />,
    );

    expect(html).toMatch(/aria-label="Zoom out"[^>]*disabled/);
    expect(html).toMatch(/aria-label="Reset view"[^>]*disabled/);
  });

  it('renders safely without PointerEvent or layout APIs', () => {
    expect(() => renderToStaticMarkup(
      <TurkeyMap data={testData} zoomable zoomControls showTooltip />,
    )).not.toThrow();
  });
});
