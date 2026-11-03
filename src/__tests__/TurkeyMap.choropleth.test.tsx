import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import { alpha, beta, testData } from '../../tests/fixtures/cities';
import { getCityGroup, getCityPath } from '../../tests/helpers';
import { installMatchMedia } from '../../tests/tooltip-helpers';
import {
  createCountingCity,
  expectOnlyRendered,
  resetCounts,
} from '../../tests/render-counts';
import type { ChoroplethValues } from '../types';

const idleFill = 'var(--tm-idle-color, #444)';
const hoverStroke = 'var(--tm-hover-color, #dc3522)';
const strokeColor = 'var(--tm-stroke-color, none)';
const strokeWidth = 'var(--tm-stroke-width, 0.5)';
const noDataFill = 'var(--tm-no-data-color, #eeeeee)';
const disabledFill = 'var(--tm-disabled-color, #e5e5e5)';
const selectedStroke = '#7a1a10';

const pathOf = (container: HTMLElement, name: string): SVGPathElement => (
  getCityPath(getCityGroup(container, name))
);

const baseValues: ChoroplethValues = { alpha: 0, beta: 100 };
const baseScale = ['#000000', '#ffffff'];
const gamma = {
  id: 'gamma',
  plateNumber: 3,
  name: 'Gamma',
  path: 'M 40 40 L 50 50 L 40 50 Z',
};
const threeCityData = { cities: [alpha, beta, gamma] };

describe('TurkeyMap choropleth values', () => {
  it('colors provinces from the scale and uses no-data for missing values', () => {
    const { container } = render(
      <TurkeyMap
        data={threeCityData}
        values={{ alpha: 0, beta: 100 }}
        colorScale={baseScale}
      />,
    );

    expect(pathOf(container, 'Alpha').style.fill).toBe('#000000');
    expect(pathOf(container, 'Beta').style.fill).toBe('#ffffff');
    expect(pathOf(container, 'Gamma').style.fill).toBe(noDataFill);
  });

  it('uses the documented no-data custom property by default', () => {
    const { container } = render(
      <TurkeyMap data={testData} values={{}} />,
    );

    expect(pathOf(container, 'Alpha').style.fill).toBe(noDataFill);
    expect(pathOf(container, 'Beta').style.fill).toBe(noDataFill);
  });

  it('lets noDataColor override the CSS variable', () => {
    const { container } = render(
      <TurkeyMap data={testData} values={{}} noDataColor="#d9d9d9" />,
    );

    expect(pathOf(container, 'Alpha').style.fill).toBe('#d9d9d9');
  });

  it('treats non-finite and non-number values as no-data', () => {
    const values = {
      alpha: Number.NaN,
      beta: Number.POSITIVE_INFINITY,
    } as ChoroplethValues;
    const { container } = render(
      <TurkeyMap data={testData} values={values} noDataColor="#123456" />,
    );

    expect(pathOf(container, 'Alpha').style.fill).toBe('#123456');
    expect(pathOf(container, 'Beta').style.fill).toBe('#123456');
  });

  it('ignores unknown city ids', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        values={{ alpha: 0, beta: 100, unknown: 50 }}
        colorScale={baseScale}
      />,
    );

    expect(pathOf(container, 'Alpha').style.fill).toBe('#000000');
    expect(pathOf(container, 'Beta').style.fill).toBe('#ffffff');
  });

  it('uses the default palette when colorScale is omitted', () => {
    const { container } = render(
      <TurkeyMap data={testData} values={{ alpha: 0, beta: 100 }} />,
    );

    expect(pathOf(container, 'Alpha').style.fill).toBe('#f7fbff');
    expect(pathOf(container, 'Beta').style.fill).toBe('#08306b');
  });
});

describe('TurkeyMap choropleth backward compatibility', () => {
  it('keeps idle styling when values are omitted', () => {
    const { container } = render(<TurkeyMap data={testData} />);
    const path = pathOf(container, 'Alpha');

    expect(path.style.fill).toBe(idleFill);
    expect(path.style.stroke).toBe(strokeColor);
    expect(path.style.strokeWidth).toBe(strokeWidth);
    expect(path.style.transition).toBe('');
  });

  it('keeps customStyle, selection, disabled, and getCityStyle behavior without values', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        customStyle={{ idleColor: '#111111', hoverColor: '#222222', selectedColor: '#333333' }}
        selectionMode="single"
        selectedCity="alpha"
        disabledCities={['beta']}
        getCityStyle={(city) => (city.id === 'alpha' ? undefined : { fill: '#444444' })}
      />,
    );

    expect(pathOf(container, 'Alpha').style.fill).toBe('#333333');
    expect(pathOf(container, 'Beta').style.fill).toBe('#444444');
  });

  it('keeps selected fill over hover without values', () => {
    const { container } = render(
      <TurkeyMap data={testData} selectionMode="single" selectedCity="alpha" />,
    );

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));

    expect(pathOf(container, 'Alpha').style.fill).toBe('var(--tm-selected-color, #dc3522)');
  });
});

describe('TurkeyMap choropleth interaction composition', () => {
  it('keeps the value fill on hover and uses the hover color as an outline', () => {
    const { container } = render(
      <TurkeyMap data={testData} values={baseValues} colorScale={baseScale} />,
    );

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));

    const path = pathOf(container, 'Alpha');
    expect(path.style.fill).toBe('#000000');
    expect(path.style.stroke).toBe(hoverStroke);
    expect(path.style.strokeWidth).toBe('1');
  });

  it('widens a numeric hover outline to at least the general width', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        values={baseValues}
        colorScale={baseScale}
        customStyle={{
          idleColor: '#444',
          hoverColor: '#abcdef',
          strokeWidth: 2,
        }}
      />,
    );

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));

    const path = pathOf(container, 'Alpha');
    expect(path.style.fill).toBe('#000000');
    expect(path.style.stroke).toBe('#abcdef');
    expect(path.style.strokeWidth).toBe('2');
  });

  it('keeps the value fill on selection and uses the selected stroke', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        values={baseValues}
        colorScale={baseScale}
        selectionMode="single"
        selectedCity="alpha"
      />,
    );

    const path = pathOf(container, 'Alpha');
    expect(path.style.fill).toBe('#000000');
    expect(path.style.stroke).toBe(selectedStroke);
    expect(path.style.strokeWidth).toBe('1.5');
  });

  it('keeps the selected stroke when a selected province is hovered', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        values={baseValues}
        colorScale={baseScale}
        selectionMode="single"
        selectedCity="alpha"
      />,
    );

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));

    const path = pathOf(container, 'Alpha');
    expect(path.style.fill).toBe('#000000');
    expect(path.style.stroke).toBe(selectedStroke);
    expect(path.style.strokeWidth).toBe('1.5');
  });

  it('keeps disabled styling over the value fill', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        values={baseValues}
        colorScale={baseScale}
        disabledCities={['alpha']}
        customStyle={{ idleColor: '#444', hoverColor: '#dc3522', strokeColor: '#ffffff' }}
      />,
    );

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));

    const path = pathOf(container, 'Alpha');
    expect(path.style.fill).toBe(disabledFill);
    expect(path.style.cursor).toBe('not-allowed');
    expect(path.style.stroke).toBe('#ffffff');
  });

  it('lets getCityStyle override the choropleth fill and outline', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        values={baseValues}
        colorScale={baseScale}
        getCityStyle={(city) => (
          city.id === 'alpha'
            ? { fill: '#123456', stroke: '#654321', transition: 'none' }
            : undefined
        )}
      />,
    );

    const alphaPath = pathOf(container, 'Alpha');
    expect(alphaPath.style.fill).toBe('#123456');
    expect(alphaPath.style.stroke).toBe('#654321');
    expect(pathOf(container, 'Beta').style.fill).toBe('#ffffff');
  });

  it('applies interaction outlines to no-data provinces too', () => {
    const { container } = render(
      <TurkeyMap data={testData} values={{ alpha: 0 }} colorScale={baseScale} />,
    );

    fireEvent.mouseEnter(getCityGroup(container, 'Beta'));

    const path = pathOf(container, 'Beta');
    expect(path.style.fill).toBe(noDataFill);
    expect(path.style.stroke).toBe(hoverStroke);
  });

  it('uses the selected stroke for a selected no-data province', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        values={{ alpha: 0 }}
        colorScale={baseScale}
        selectionMode="single"
        selectedCity="beta"
      />,
    );

    const path = pathOf(container, 'Beta');
    expect(path.style.fill).toBe(noDataFill);
    expect(path.style.stroke).toBe(selectedStroke);
  });
});

describe('TurkeyMap choropleth value transitions', () => {
  it('emits a fill transition when animateValues is enabled', () => {
    const matchMedia = installMatchMedia(false);

    try {
      const { container } = render(
        <TurkeyMap
          data={testData}
          values={baseValues}
          colorScale={baseScale}
          animateValues={true}
        />,
      );

      expect(pathOf(container, 'Alpha').style.transition).toBe('fill 300ms ease');
    } finally {
      matchMedia.restore();
    }
  });

  it('does not animate by default', () => {
    const matchMedia = installMatchMedia(false);

    try {
      const { container } = render(
        <TurkeyMap data={testData} values={baseValues} colorScale={baseScale} />,
      );

      expect(pathOf(container, 'Alpha').style.transition).toBe('');
    } finally {
      matchMedia.restore();
    }
  });

  it('does not animate when reduced motion is preferred', () => {
    const matchMedia = installMatchMedia(true);

    try {
      const { container } = render(
        <TurkeyMap
          data={testData}
          values={baseValues}
          colorScale={baseScale}
          animateValues={true}
        />,
      );

      expect(pathOf(container, 'Alpha').style.transition).toBe('');
    } finally {
      matchMedia.restore();
    }
  });

  it('reacts to a runtime reduced-motion change', () => {
    const matchMedia = installMatchMedia(false);

    try {
      const { container } = render(
        <TurkeyMap
          data={testData}
          values={baseValues}
          colorScale={baseScale}
          animateValues={true}
        />,
      );

      expect(pathOf(container, 'Alpha').style.transition).toBe('fill 300ms ease');

      matchMedia.change(true);
      expect(pathOf(container, 'Alpha').style.transition).toBe('');

      matchMedia.change(false);
      expect(pathOf(container, 'Alpha').style.transition).toBe('fill 300ms ease');
    } finally {
      matchMedia.restore();
    }
  });
});

describe('TurkeyMap choropleth server rendering', () => {
  it('renders values, transitions, and a custom tooltip without browser globals', () => {
    const html = renderToStaticMarkup(
      <TurkeyMap
        data={testData}
        values={baseValues}
        colorScale={baseScale}
        animateValues={true}
        showTooltip={true}
        renderTooltip={(city, value) => `${city.name}: ${String(value)}`}
      />,
    );

    expect(html).toContain('fill:#000000');
    expect(html).toContain('fill:#ffffff');
    expect(html).toContain('role="tooltip"');
    expect(html).not.toContain('fill 300ms ease');
  });
});

describe('TurkeyMap choropleth render isolation', () => {
  const createCities = () => {
    const alphaCity = createCountingCity('alpha', 1, 'Alpha', 'M 0 0 L 10 10 L 0 10 Z');
    const betaCity = createCountingCity('beta', 2, 'Beta', 'M 20 20 L 30 30 L 20 30 Z');
    const gammaCity = createCountingCity('gamma', 3, 'Gamma', 'M 40 40 L 50 50 L 40 50 Z');

    return {
      alpha: alphaCity,
      beta: betaCity,
      gamma: gammaCity,
      all: { alpha: alphaCity, beta: betaCity, gamma: gammaCity },
      data: { cities: [alphaCity.city, betaCity.city, gammaCity.city] },
    };
  };

  it('re-renders only the province whose value changed', () => {
    const { alpha: alphaCity, beta: betaCity, gamma: gammaCity, all, data } = createCities();
    const { container, rerender } = render(
      <TurkeyMap
        data={data}
        values={{ alpha: 0, beta: 50, gamma: 100 }}
        colorScale={['#000000', '#ff0000']}
      />,
    );
    resetCounts(alphaCity, betaCity, gammaCity);

    rerender(
      <TurkeyMap
        data={data}
        values={{ alpha: 0, beta: 75, gamma: 100 }}
        colorScale={['#000000', '#ff0000']}
      />,
    );

    expectOnlyRendered(all, ['beta']);
    expect(container.querySelector('g[data-iladi="Beta"]')).toBeInTheDocument();
  });

  it('keeps hover local to one province while values are active', () => {
    const { alpha: alphaCity, beta: betaCity, gamma: gammaCity, all, data } = createCities();
    const { container } = render(
      <TurkeyMap
        data={data}
        values={{ alpha: 0, beta: 50, gamma: 100 }}
        colorScale={['#000000', '#ff0000']}
      />,
    );
    resetCounts(alphaCity, betaCity, gammaCity);

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));

    expectOnlyRendered(all, ['alpha']);
    expect(pathOf(container, 'Alpha').style.fill).toBe('#000000');
  });
});
