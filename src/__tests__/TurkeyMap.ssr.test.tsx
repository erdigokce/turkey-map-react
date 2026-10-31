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
