import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import { testData } from '../../tests/fixtures/cities';

describe('TurkeyMap server rendering', () => {
  it('renders the default map to static markup', () => {
    const html = renderToStaticMarkup(<TurkeyMap />);

    expect(html).toContain('id="svg-turkiye-haritasi"');
    expect(html.match(/data-iladi=/g)).toHaveLength(81);
  });

  it('renders custom data to static markup', () => {
    const html = renderToStaticMarkup(<TurkeyMap data={testData} />);

    expect(html).toContain('data-iladi="Alpha"');
    expect(html).toContain('data-iladi="Beta"');
    expect(html.match(/data-iladi=/g)).toHaveLength(2);
    expect(html).toContain('id="turkiye" role="group" aria-label="Turkey map"');
    expect(html).toContain('data-tm-city-id="alpha"');
    expect(html).toContain('role="button" aria-label="Alpha, plate 1"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"');
  });

  it('renders selection semantics to static markup', () => {
    const html = renderToStaticMarkup(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        selectedCities={['alpha']}
      />,
    );

    expect(html).toContain('role="listbox"');
    expect(html).toContain('aria-multiselectable="true"');
    expect(html).toContain('role="option" aria-label="Alpha, plate 1" aria-selected="true"');
    expect(html).toContain('role="option" aria-label="Beta, plate 2" aria-selected="false"');
  });

  it('renders the hidden state to static markup', () => {
    const html = renderToStaticMarkup(<TurkeyMap visible={false} />);

    expect(html).toMatch(/hidden(=|>|\s)/);
  });

  it('renders the tooltip and keyframes to static markup', () => {
    const html = renderToStaticMarkup(
      <TurkeyMap showTooltip={true} tooltipText="SSR tooltip" />,
    );

    expect(html).toContain('SSR tooltip');
    expect(html).toContain('@keyframes turkey_react_map_tooltip_fade_out');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('pointer-events:none');
    expect(html).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('renders custom colors to static markup', () => {
    const html = renderToStaticMarkup(
      <TurkeyMap
        data={testData}
        customStyle={{ idleColor: '#123456', hoverColor: '#abcdef' }}
      />,
    );

    expect(html).toContain('#123456');
  });
});
