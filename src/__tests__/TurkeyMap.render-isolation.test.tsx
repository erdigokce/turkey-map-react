import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import { getCityGroup, getCityPath, getTooltip } from '../../tests/helpers';
import {
  createCountingCity,
  expectOnlyRendered,
  resetCounts,
} from '../../tests/render-counts';

const createCities = () => {
  const alpha = createCountingCity('alpha', 1, 'Alpha', 'M 0 0 L 10 10 L 0 10 Z');
  const beta = createCountingCity('beta', 2, 'Beta', 'M 20 20 L 30 30 L 20 30 Z');
  const gamma = createCountingCity('gamma', 3, 'Gamma', 'M 40 40 L 50 50 L 40 50 Z');

  return {
    alpha,
    beta,
    gamma,
    all: { alpha, beta, gamma },
    data: { cities: [alpha.city, beta.city, gamma.city] },
  };
};

const selectAlphaPath = (container: HTMLElement): SVGPathElement => (
  getCityPath(getCityGroup(container, 'Alpha'))
);

describe('TurkeyMap render isolation: hover', () => {
  it('re-renders only the hovered province when the tooltip is off', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const { container } = render(<TurkeyMap data={data} />);
    resetCounts(alpha, beta, gamma);

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
    expectOnlyRendered(all, ['alpha']);

    resetCounts(alpha, beta, gamma);
    fireEvent.mouseLeave(getCityGroup(container, 'Alpha'));
    expectOnlyRendered(all, ['alpha']);

    resetCounts(alpha, beta, gamma);
    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
    resetCounts(alpha, beta, gamma);
    fireEvent.mouseEnter(getCityGroup(container, 'Beta'));
    expectOnlyRendered(all, ['alpha', 'beta']);
  });

  it('ignores a stale leave from a province that is no longer hovered', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const { container } = render(<TurkeyMap data={data} />);

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
    fireEvent.mouseEnter(getCityGroup(container, 'Beta'));
    resetCounts(alpha, beta, gamma);

    fireEvent.mouseLeave(getCityGroup(container, 'Alpha'));

    expectOnlyRendered(all, ['alpha']);
  });

  it('keeps hover isolated while the tooltip updates', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const { container } = render(
      <TurkeyMap data={data} showTooltip={true} tooltipText="Province tooltip" />,
    );
    resetCounts(alpha, beta, gamma);

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
    expectOnlyRendered(all, ['alpha']);

    resetCounts(alpha, beta, gamma);
    fireEvent.mouseMove(getCityGroup(container, 'Alpha'), { pageX: 40, pageY: 50 });
    expectOnlyRendered(all, []);

    resetCounts(alpha, beta, gamma);
    fireEvent.mouseLeave(getCityGroup(container, 'Alpha'));
    expectOnlyRendered(all, ['alpha']);
  });
  it('does not force provinces to re-render when cityWrapper runs', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const cityWrapper = jest.fn((cityComponent: React.ReactElement) => cityComponent);
    const { container } = render(
      <TurkeyMap data={data} showTooltip={true} cityWrapper={cityWrapper} />,
    );
    resetCounts(alpha, beta, gamma);

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));

    expectOnlyRendered(all, ['alpha']);
    expect(cityWrapper).toHaveBeenCalled();
  });
});

describe('TurkeyMap render isolation: selection', () => {
  it('re-renders only the selected or deselected province', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const { container } = render(
      <TurkeyMap data={data} selectionMode="multiple" />,
    );
    resetCounts(alpha, beta, gamma);

    fireEvent.click(selectAlphaPath(container));
    expectOnlyRendered(all, ['alpha']);

    resetCounts(alpha, beta, gamma);
    fireEvent.click(selectAlphaPath(container));
    expectOnlyRendered(all, ['alpha']);

    expect(beta.total()).toBe(0);
    expect(gamma.total()).toBe(0);
  });

  it('re-renders only provinces whose controlled selection changed', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const { container, rerender } = render(
      <TurkeyMap data={data} selectionMode="multiple" selectedCities={[]} />,
    );
    resetCounts(alpha, beta, gamma);

    rerender(
      <TurkeyMap data={data} selectionMode="multiple" selectedCities={[alpha.city.id]} />,
    );
    expectOnlyRendered(all, ['alpha']);

    resetCounts(alpha, beta, gamma);
    rerender(
      <TurkeyMap data={data} selectionMode="multiple" selectedCities={[beta.city.id]} />,
    );
    expectOnlyRendered(all, ['alpha', 'beta']);

    resetCounts(alpha, beta, gamma);
    rerender(
      <TurkeyMap data={data} selectionMode="multiple" selectedCities={[beta.city.id]} />,
    );
    expectOnlyRendered(all, []);

    expect(container.querySelector('g[data-iladi="Beta"]')).toBeInTheDocument();
  });
});

describe('TurkeyMap render isolation: focus', () => {
  it('re-renders only the focused province and preserves the focus indicator', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const { container } = render(
      <TurkeyMap data={data} selectionMode="single" />,
    );
    const group = getCityGroup(container, 'Alpha');
    resetCounts(alpha, beta, gamma);

    fireEvent.focus(group);
    expectOnlyRendered(all, ['alpha']);
    expect(group.style.outline).toBe('2px solid #1a73e8');
    expect(group.style.outlineColor).toBe('var(--tm-focus-ring, #1a73e8)');

    resetCounts(alpha, beta, gamma);
    fireEvent.blur(group);
    expectOnlyRendered(all, ['alpha']);
    expect(group.style.outline).toBe('');

    fireEvent.focus(group);
    resetCounts(alpha, beta, gamma);
    fireEvent.keyDown(group, { key: 'Enter' });
    expectOnlyRendered(all, ['alpha']);
    expect(group.style.outline).toBe('2px solid #1a73e8');
  });

  it('supports roving focus and activation in none mode', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const onClick = jest.fn();
    const { container } = render(<TurkeyMap data={data} onClick={onClick} />);
    const group = getCityGroup(container, 'Alpha');
    resetCounts(alpha, beta, gamma);

    fireEvent.focus(group);
    expectOnlyRendered(all, ['alpha']);
    expect(group.style.outline).toBe('2px solid #1a73e8');

    resetCounts(alpha, beta, gamma);
    fireEvent.keyDown(group, { key: 'Enter' });
    expectOnlyRendered(all, ['alpha']);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('TurkeyMap render isolation: callback replacement', () => {
  it('uses the latest onHover without re-rendering provinces', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const firstOnHover = jest.fn();
    const secondOnHover = jest.fn();
    const { container, rerender } = render(
      <TurkeyMap data={data} onHover={firstOnHover} />,
    );
    resetCounts(alpha, beta, gamma);

    rerender(<TurkeyMap data={data} onHover={secondOnHover} />);
    expectOnlyRendered(all, []);

    fireEvent.mouseOver(selectAlphaPath(container));
    expect(firstOnHover).not.toHaveBeenCalled();
    expect(secondOnHover).toHaveBeenCalledTimes(1);
  });

  it('uses the latest onClick without re-rendering provinces', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const firstOnClick = jest.fn();
    const secondOnClick = jest.fn();
    const { container, rerender } = render(
      <TurkeyMap data={data} onClick={firstOnClick} />,
    );
    resetCounts(alpha, beta, gamma);

    rerender(<TurkeyMap data={data} onClick={secondOnClick} />);
    expectOnlyRendered(all, []);

    fireEvent.click(selectAlphaPath(container));
    expect(firstOnClick).not.toHaveBeenCalled();
    expect(secondOnClick).toHaveBeenCalledTimes(1);
  });

  it('uses the latest selection callbacks without re-rendering provinces', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const firstOnSelect = jest.fn();
    const secondOnSelect = jest.fn();
    const firstOnSelectionChange = jest.fn();
    const secondOnSelectionChange = jest.fn();
    const { container, rerender } = render(
      <TurkeyMap
        data={data}
        selectionMode="multiple"
        onSelect={firstOnSelect}
        onSelectionChange={firstOnSelectionChange}
      />,
    );
    resetCounts(alpha, beta, gamma);

    rerender(
      <TurkeyMap
        data={data}
        selectionMode="multiple"
        onSelect={secondOnSelect}
        onSelectionChange={secondOnSelectionChange}
      />,
    );
    expectOnlyRendered(all, []);

    fireEvent.click(selectAlphaPath(container));
    expect(secondOnSelect).toHaveBeenCalledTimes(1);
    expect(secondOnSelectionChange).toHaveBeenCalledTimes(1);
    expect(firstOnSelect).not.toHaveBeenCalled();
    expect(firstOnSelectionChange).not.toHaveBeenCalled();
  });

  it('uses the latest onMaxSelectionReached without re-rendering provinces', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const firstOnMax = jest.fn();
    const secondOnMax = jest.fn();
    const { container, rerender } = render(
      <TurkeyMap
        data={data}
        selectionMode="multiple"
        defaultSelectedCities={[alpha.city.id]}
        maxSelection={1}
        onMaxSelectionReached={firstOnMax}
      />,
    );
    resetCounts(alpha, beta, gamma);

    rerender(
      <TurkeyMap
        data={data}
        selectionMode="multiple"
        defaultSelectedCities={[alpha.city.id]}
        maxSelection={1}
        onMaxSelectionReached={secondOnMax}
      />,
    );
    expectOnlyRendered(all, []);

    fireEvent.click(getCityPath(getCityGroup(container, 'Beta')));
    expect(firstOnMax).not.toHaveBeenCalled();
    expect(secondOnMax).toHaveBeenCalledTimes(1);
  });

  it('updates disabled state from the latest isCityDisabled without unrelated renders', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const firstIsCityDisabled = () => false;
    const secondIsCityDisabled = () => false;
    const thirdIsCityDisabled = (city: { id: string }) => city.id === 'alpha';
    const { container, rerender } = render(
      <TurkeyMap data={data} isCityDisabled={firstIsCityDisabled} />,
    );
    resetCounts(alpha, beta, gamma);

    rerender(<TurkeyMap data={data} isCityDisabled={secondIsCityDisabled} />);
    expectOnlyRendered(all, []);
    expect(getCityGroup(container, 'Alpha')).not.toHaveAttribute('aria-disabled');

    resetCounts(alpha, beta, gamma);
    rerender(<TurkeyMap data={data} isCityDisabled={thirdIsCityDisabled} />);
    expectOnlyRendered(all, ['alpha', 'beta']);
    expect(getCityGroup(container, 'Alpha')).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('TurkeyMap render isolation: data, style, and disabled updates', () => {
  it('re-renders only the province whose city entry changed', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const betaReplacement = createCountingCity(
      'beta',
      2,
      'Beta Two',
      'M 20 20 L 35 35 L 20 35 Z',
    );
    const { container, rerender } = render(<TurkeyMap data={data} />);
    resetCounts(alpha, beta, gamma, betaReplacement);

    rerender(
      <TurkeyMap data={{ cities: [alpha.city, betaReplacement.city, gamma.city] }} />,
    );

    expectOnlyRendered({ ...all, beta: betaReplacement }, ['beta']);
    expect(container.querySelector('g[data-iladi="Beta Two"]')).toBeInTheDocument();
  });

  it('re-renders every province when customStyle values change and keeps selection', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const { container, rerender } = render(
      <TurkeyMap data={data} selectionMode="single" selectedCity={alpha.city.id} />,
    );
    resetCounts(alpha, beta, gamma);

    rerender(
      <TurkeyMap
        data={data}
        selectionMode="single"
        selectedCity={alpha.city.id}
        customStyle={{
          idleColor: '#111111',
          hoverColor: '#222222',
          selectedColor: '#333333',
        }}
      />,
    );

    expectOnlyRendered(all, ['alpha', 'beta', 'gamma']);
    expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveStyle({ fill: '#333333' });
    expect(getCityPath(getCityGroup(container, 'Beta'))).toHaveStyle({ fill: '#111111' });
  });

  it('re-renders only the province whose disabled state changed', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const { container, rerender } = render(<TurkeyMap data={data} />);
    resetCounts(alpha, beta, gamma);

    rerender(<TurkeyMap data={data} disabledCities={[beta.city.id]} />);

    expectOnlyRendered(all, ['beta']);
    expect(getCityPath(getCityGroup(container, 'Beta'))).toHaveStyle({
      fill: 'var(--tm-disabled-color, #e5e5e5)',
    });
  });

  it('isolates disabled tooltip enter and leave to the disabled province', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const { container } = render(
      <TurkeyMap
        data={data}
        showTooltip={true}
        disabledTooltipText="Not available"
        disabledCities={[alpha.city.id]}
      />,
    );
    resetCounts(alpha, beta, gamma);

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
    expectOnlyRendered(all, ['alpha']);
    expect(getTooltip(container)).toHaveTextContent('Not available');

    resetCounts(alpha, beta, gamma);
    fireEvent.mouseLeave(getCityGroup(container, 'Alpha'));
    expectOnlyRendered(all, ['alpha']);
  });

  it('keeps selected styling over hover without extra renders', () => {
    const { alpha, beta, gamma, all, data } = createCities();
    const { container } = render(
      <TurkeyMap
        data={data}
        selectionMode="single"
        selectedCity={alpha.city.id}
        customStyle={{
          idleColor: '#111111',
          hoverColor: '#222222',
          selectedColor: '#333333',
        }}
      />,
    );
    resetCounts(alpha, beta, gamma);

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
    expectOnlyRendered(all, ['alpha']);
    expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveStyle({ fill: '#333333' });

    resetCounts(alpha, beta, gamma);
    fireEvent.mouseEnter(getCityGroup(container, 'Beta'));
    expectOnlyRendered(all, ['alpha', 'beta']);
    expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveStyle({ fill: '#333333' });
    expect(getCityPath(getCityGroup(container, 'Beta'))).toHaveStyle({ fill: '#222222' });
  });
});
