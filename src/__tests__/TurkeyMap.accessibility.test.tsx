import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import TurkeyMap from '../index';
import { CityType } from '../types';
import {
  alpha,
  beta,
  customDisabledData,
  disabledAlpha,
  testData,
} from '../../tests/fixtures/cities';
import { getCityGroup, getCityGroups, getCityPath } from '../../tests/helpers';

expect.extend(toHaveNoViolations);

const gamma: CityType = {
  id: 'gamma',
  plateNumber: 3,
  name: 'Gamma',
  path: 'M 40 40 L 50 50 L 40 50 Z',
};

const threeCities = { cities: [alpha, beta, gamma] };
const generalStroke = 'var(--tm-stroke-color, none)';

const getProvinceContainer = (container: HTMLElement): SVGGElement => {
  const group = container.querySelector('g#turkiye');
  if (!(group instanceof Element)) {
    throw new Error('Province container was not rendered');
  }
  return group as SVGGElement;
};

const getLiveRegion = (container: HTMLElement): HTMLElement => {
  const region = container.querySelector('[role="status"]');
  if (!(region instanceof HTMLElement)) {
    throw new Error('Live region was not rendered');
  }
  return region;
};

const getFallbackSelect = (container: HTMLElement): HTMLSelectElement => {
  const select = container.querySelector('select');
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error('Fallback select was not rendered');
  }
  return select;
};

const selectedNames = (container: HTMLElement): string[] => (
  getCityGroups(container)
    .filter((group) => getCityPath(group).style.stroke !== generalStroke)
    .map((group) => group.getAttribute('data-iladi') ?? '')
);

const changeMultipleSelect = (select: HTMLSelectElement, ids: string[]): void => {
  Array.from(select.options).forEach((option) => {
    option.selected = ids.includes(option.value);
  });
  fireEvent.change(select);
};

describe('TurkeyMap accessibility semantics', () => {
  it('exposes a labeled single-select listbox', () => {
    const { container } = render(
      <TurkeyMap data={testData} selectionMode="single" />,
    );
    const provinceContainer = getProvinceContainer(container);

    expect(provinceContainer).toHaveAttribute('role', 'listbox');
    expect(provinceContainer).toHaveAttribute('aria-label', 'Turkey map');
    expect(provinceContainer).not.toHaveAttribute('aria-multiselectable');
  });

  it('exposes a multiselect listbox in multiple mode', () => {
    const { container } = render(
      <TurkeyMap data={testData} selectionMode="multiple" />,
    );

    expect(getProvinceContainer(container)).toHaveAttribute('role', 'listbox');
    expect(getProvinceContainer(container))
      .toHaveAttribute('aria-multiselectable', 'true');
  });

  it('exposes a labeled group in none mode and allows localization', () => {
    const { container, rerender } = render(<TurkeyMap data={testData} />);

    expect(getProvinceContainer(container)).toHaveAttribute('role', 'group');
    expect(getProvinceContainer(container)).toHaveAttribute('aria-label', 'Turkey map');

    rerender(<TurkeyMap data={testData} ariaLabel="Türkiye haritası" />);
    expect(getProvinceContainer(container))
      .toHaveAttribute('aria-label', 'Türkiye haritası');
  });

  it('keeps legacy ids on every supported mode', () => {
    const { container } = render(
      <TurkeyMap data={testData} selectionMode="multiple" />,
    );

    expect(container.querySelector('#svg-turkiye-haritasi-container')).toBeInTheDocument();
    expect(container.querySelector('#svg-turkiye-haritasi')).toBeInTheDocument();
    expect(container.querySelector('#turkiye')).toBeInTheDocument();
    expect(getCityGroup(container, 'Alpha')).toHaveAttribute('id', 'alpha');
  });

  it('labels every province with its plate number and exposes selection state', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        selectedCities={[alpha.id]}
      />,
    );
    const alphaGroup = getCityGroup(container, 'Alpha');
    const betaGroup = getCityGroup(container, 'Beta');

    expect(alphaGroup).toHaveAttribute('role', 'option');
    expect(alphaGroup).toHaveAttribute('aria-label', 'Alpha, plate 1');
    expect(alphaGroup).toHaveAttribute('aria-selected', 'true');
    expect(alphaGroup).toHaveAttribute('data-tm-city-id', 'alpha');

    expect(betaGroup).toHaveAttribute('role', 'option');
    expect(betaGroup).toHaveAttribute('aria-label', 'Beta, plate 2');
    expect(betaGroup).toHaveAttribute('aria-selected', 'false');
  });

  it('uses button semantics without aria-selected in none mode', () => {
    const { container } = render(<TurkeyMap data={testData} />);
    const alphaGroup = getCityGroup(container, 'Alpha');

    expect(alphaGroup).toHaveAttribute('role', 'button');
    expect(alphaGroup).toHaveAttribute('aria-label', 'Alpha, plate 1');
    expect(alphaGroup).not.toHaveAttribute('aria-selected');
  });

  it('keeps accessible names and real selection state on disabled provinces', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        selectedCities={[alpha.id]}
        disabledCities={[alpha.id]}
      />,
    );
    const alphaGroup = getCityGroup(container, 'Alpha');

    expect(alphaGroup).toHaveAttribute('aria-label', 'Alpha, plate 1');
    expect(alphaGroup).toHaveAttribute('aria-disabled', 'true');
    expect(alphaGroup).toHaveAttribute('aria-selected', 'true');
  });

  it('renders one polite, atomic live region', () => {
    const { container } = render(<TurkeyMap data={testData} />);
    const regions = container.querySelectorAll('[role="status"]');

    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveAttribute('aria-live', 'polite');
    expect(regions[0]).toHaveAttribute('aria-atomic', 'true');
  });
});

describe('TurkeyMap accessibility roving tabindex', () => {
  it('keeps exactly one province tabbable', () => {
    const { container } = render(
      <TurkeyMap data={threeCities} selectionMode="single" />,
    );
    const tabbable = getCityGroups(container).filter(
      (group) => group.getAttribute('tabindex') === '0',
    );

    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(getCityGroup(container, 'Alpha'));
    getCityGroups(container).forEach((group) => {
      if (group !== tabbable[0]) {
        expect(group).toHaveAttribute('tabindex', '-1');
      }
    });
  });

  it('starts on the first selected city in data order', () => {
    const { container } = render(
      <TurkeyMap
        data={threeCities}
        selectionMode="multiple"
        selectedCities={[gamma.id, beta.id]}
      />,
    );

    expect(getCityGroup(container, 'Beta')).toHaveAttribute('tabindex', '0');
    expect(getCityGroup(container, 'Gamma')).toHaveAttribute('tabindex', '-1');
  });

  it('falls back to the first enabled province when the first is disabled', () => {
    const { container } = render(<TurkeyMap data={customDisabledData} />);

    expect(getCityGroup(container, 'Alpha')).toHaveAttribute('tabindex', '-1');
    expect(getCityGroup(container, 'Beta')).toHaveAttribute('tabindex', '0');
  });

  it('repairs the tab stop when the current roving city is removed', () => {
    const { container, rerender } = render(
      <TurkeyMap data={threeCities} selectionMode="single" selectedCity={gamma.id} />,
    );

    expect(getCityGroup(container, 'Gamma')).toHaveAttribute('tabindex', '0');

    rerender(
      <TurkeyMap
        data={{ cities: [alpha, beta] }}
        selectionMode="single"
        selectedCity={gamma.id}
      />,
    );

    expect(getCityGroup(container, 'Alpha')).toHaveAttribute('tabindex', '0');
  });

  it('moves focus with arrows, Home, and End while clamping at boundaries', () => {
    const { container } = render(<TurkeyMap data={threeCities} />);
    const alphaGroup = getCityGroup(container, 'Alpha');
    const betaGroup = getCityGroup(container, 'Beta');
    const gammaGroup = getCityGroup(container, 'Gamma');

    fireEvent.focus(alphaGroup);
    fireEvent.keyDown(alphaGroup, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(betaGroup);
    expect(betaGroup).toHaveAttribute('tabindex', '0');
    expect(alphaGroup).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(betaGroup, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(gammaGroup);

    fireEvent.keyDown(gammaGroup, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(betaGroup);

    fireEvent.keyDown(betaGroup, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(alphaGroup);

    fireEvent.keyDown(alphaGroup, { key: 'End' });
    expect(document.activeElement).toBe(gammaGroup);

    fireEvent.keyDown(gammaGroup, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(gammaGroup);

    fireEvent.keyDown(gammaGroup, { key: 'Home' });
    expect(document.activeElement).toBe(alphaGroup);

    fireEvent.keyDown(alphaGroup, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(alphaGroup);
  });

  it('navigates into disabled provinces without activating them', () => {
    const onClick = jest.fn();
    const { container } = render(
      <TurkeyMap data={customDisabledData} onClick={onClick} />,
    );
    const alphaGroup = getCityGroup(container, 'Alpha');
    const betaGroup = getCityGroup(container, 'Beta');

    fireEvent.focus(betaGroup);
    fireEvent.keyDown(betaGroup, { key: 'ArrowLeft' });

    expect(document.activeElement).toBe(alphaGroup);
    expect(getLiveRegion(container)).toHaveTextContent('Alpha, plate 1, disabled');

    fireEvent.keyDown(alphaGroup, { key: 'Enter' });
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('TurkeyMap accessibility keyboard activation', () => {
  it('selects with Enter and Space in multiple mode', () => {
    const onSelect = jest.fn();
    const onSelectionChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />,
    );
    const alphaGroup = getCityGroup(container, 'Alpha');

    fireEvent.focus(alphaGroup);
    fireEvent.keyDown(alphaGroup, { key: 'Enter' });
    expect(selectedNames(container)).toEqual(['Alpha']);

    fireEvent.keyDown(alphaGroup, { key: ' ' });
    expect(selectedNames(container)).toEqual([]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
  });

  it('selects with Enter in single mode', () => {
    const onSelectionChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        onSelectionChange={onSelectionChange}
      />,
    );
    const betaGroup = getCityGroup(container, 'Beta');

    fireEvent.focus(betaGroup);
    fireEvent.keyDown(betaGroup, { key: 'Enter' });

    expect(selectedNames(container)).toEqual(['Beta']);
    expect(onSelectionChange).toHaveBeenLastCalledWith([beta]);
  });

  it('activates none-mode provinces through onClick', () => {
    const onClick = jest.fn();
    const onSelect = jest.fn();
    const onSelectionChange = jest.fn();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { container } = render(
      <TurkeyMap
        data={testData}
        onClick={onClick}
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />,
    );
    const alphaGroup = getCityGroup(container, 'Alpha');

    fireEvent.focus(alphaGroup);
    fireEvent.keyDown(alphaGroup, { key: 'Enter' });
    fireEvent.keyDown(alphaGroup, { key: ' ' });

    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onClick).toHaveBeenCalledWith(alpha);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('ignores none-mode keyboard activation when onClick is absent', () => {
    const { container } = render(<TurkeyMap data={testData} />);
    const alphaGroup = getCityGroup(container, 'Alpha');

    fireEvent.focus(alphaGroup);
    fireEvent.keyDown(alphaGroup, { key: 'Enter' });

    expect(getLiveRegion(container)).toHaveTextContent('Alpha, plate 1, activated');
  });

  it('clears an uncontrolled selection with Escape without firing onSelect', () => {
    const onSelect = jest.fn();
    const onSelectionChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        defaultSelectedCities={[alpha.id, beta.id]}
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />,
    );
    const alphaGroup = getCityGroup(container, 'Alpha');

    fireEvent.focus(alphaGroup);
    fireEvent.keyDown(alphaGroup, { key: 'Escape' });

    expect(selectedNames(container)).toEqual([]);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith([]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('reports a controlled clear without mutating the rendered value', () => {
    const onSelectionChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        selectedCities={[alpha.id]}
        onSelectionChange={onSelectionChange}
      />,
    );
    const alphaGroup = getCityGroup(container, 'Alpha');

    fireEvent.focus(alphaGroup);
    fireEvent.keyDown(alphaGroup, { key: 'Escape' });

    expect(onSelectionChange).toHaveBeenCalledWith([]);
    expect(selectedNames(container)).toEqual(['Alpha']);
  });

  it('keeps Escape inert when the selection is already empty', () => {
    const onSelectionChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.focus(getCityGroup(container, 'Alpha'));
    fireEvent.keyDown(getCityGroup(container, 'Alpha'), { key: 'Escape' });

    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('keeps disabled activation inert in selection mode', () => {
    const onSelect = jest.fn();
    const onSelectionChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        disabledCities={[alpha.id]}
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />,
    );
    const alphaGroup = getCityGroup(container, 'Alpha');

    fireEvent.focus(alphaGroup);
    fireEvent.keyDown(alphaGroup, { key: 'Enter' });
    fireEvent.keyDown(alphaGroup, { key: ' ' });

    expect(selectedNames(container)).toEqual([]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

describe('TurkeyMap accessibility live region', () => {
  it('announces focus with plate number and selected state', () => {
    const { container } = render(
      <TurkeyMap data={testData} selectionMode="single" selectedCity={alpha.id} />,
    );

    fireEvent.focus(getCityGroup(container, 'Alpha'));

    expect(getLiveRegion(container)).toHaveTextContent('Alpha, plate 1, selected');
  });

  it('announces disabled focus', () => {
    const { container } = render(
      <TurkeyMap data={customDisabledData} />,
    );

    fireEvent.focus(getCityGroup(container, 'Alpha'));

    expect(getLiveRegion(container)).toHaveTextContent('Alpha, plate 1, disabled');
  });

  it('announces selection, deselection, and clearing once per change', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        defaultSelectedCities={[alpha.id]}
      />,
    );
    const alphaGroup = getCityGroup(container, 'Alpha');
    const liveRegion = getLiveRegion(container);
    const betaGroup = getCityGroup(container, 'Beta');

    fireEvent.focus(betaGroup);
    fireEvent.keyDown(betaGroup, { key: 'Enter' });
    expect(liveRegion).toHaveTextContent('Beta, plate 2, selected');

    fireEvent.focus(alphaGroup);
    fireEvent.keyDown(alphaGroup, { key: ' ' });
    expect(liveRegion).toHaveTextContent('Alpha, plate 1, not selected');

    fireEvent.keyDown(alphaGroup, { key: 'Enter' });
    expect(liveRegion).toHaveTextContent('Alpha, plate 1, selected');

    fireEvent.keyDown(alphaGroup, { key: 'Escape' });
    expect(liveRegion).toHaveTextContent('No province selected');
  });

  it('stays silent on hover and unrelated re-renders', () => {
    const { container, rerender } = render(
      <TurkeyMap data={testData} showTooltip={true} />,
    );
    const liveRegion = getLiveRegion(container);

    expect(liveRegion.textContent).toBe('');

    fireEvent.mouseOver(getCityPath(getCityGroup(container, 'Alpha')));
    expect(liveRegion.textContent).toBe('');

    rerender(<TurkeyMap data={testData} showTooltip={true} hoverable={false} />);
    expect(liveRegion.textContent).toBe('');
  });
});

describe('TurkeyMap accessibility focus ring', () => {
  it('renders the default visible focus ring in every mode', () => {
    const { container } = render(<TurkeyMap data={testData} />);
    const alphaGroup = getCityGroup(container, 'Alpha');

    fireEvent.focus(alphaGroup);

    expect(alphaGroup.style.outline).toBe('2px solid #1a73e8');
    expect(alphaGroup.style.outlineColor).toBe('var(--tm-focus-ring, #1a73e8)');
    expect(alphaGroup.style.outlineOffset).toBe('2px');
  });

  it('does not show the focus ring when focus follows a pointer press', () => {
    const { container } = render(<TurkeyMap data={testData} />);
    const alphaGroup = getCityGroup(container, 'Alpha');

    fireEvent.pointerDown(alphaGroup);
    fireEvent.focus(alphaGroup);
    fireEvent.pointerUp(alphaGroup);

    expect(alphaGroup.style.outline).toBe('none');
  });

  it('shows the focus ring again for keyboard focus after a pointer press', () => {
    const { container } = render(<TurkeyMap data={testData} />);
    const alphaGroup = getCityGroup(container, 'Alpha');

    fireEvent.pointerDown(alphaGroup);
    fireEvent.focus(alphaGroup);
    fireEvent.pointerUp(alphaGroup);
    fireEvent.blur(alphaGroup);
    fireEvent.focus(alphaGroup);

    expect(alphaGroup.style.outline).toBe('2px solid #1a73e8');
  });

  it('applies custom focus stroke values', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        customStyle={{
          idleColor: '#444',
          hoverColor: '#dc3522',
          focusStroke: '#ff0000',
          focusStrokeWidth: 3,
        }}
      />,
    );
    const alphaGroup = getCityGroup(container, 'Alpha');

    fireEvent.focus(alphaGroup);

    expect(alphaGroup.style.outline).toBe('3px solid #ff0000');
    expect(alphaGroup.style.outlineColor).toBe('var(--tm-focus-ring, #ff0000)');
  });

  it('does not change fills when a province is focused', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        selectedCity={alpha.id}
        customStyle={{
          idleColor: '#111111',
          hoverColor: '#222222',
          selectedColor: '#333333',
        }}
      />,
    );
    const alphaPath = getCityPath(getCityGroup(container, 'Alpha'));
    const betaPath = getCityPath(getCityGroup(container, 'Beta'));

    fireEvent.focus(getCityGroup(container, 'Alpha'));

    expect(alphaPath).toHaveStyle({ fill: '#333333' });
    expect(betaPath).toHaveStyle({ fill: '#111111' });
  });
});

describe('TurkeyMap accessibility fallback select', () => {
  it('is off by default', () => {
    const { container } = render(
      <TurkeyMap data={testData} selectionMode="single" />,
    );

    expect(container.querySelector('select')).toBeNull();
  });

  it('renders a hidden single select with the effective selection', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        selectedCity={beta.id}
        a11yFallback
      />,
    );
    const select = getFallbackSelect(container);

    expect(select).not.toHaveAttribute('multiple');
    expect(select).toHaveAttribute('aria-label', 'Turkey map');
    expect(select).toHaveStyle({ position: 'absolute', overflow: 'hidden' });
    expect(select.value).toBe(beta.id);
    expect(select.querySelector('option[value=""]')).toHaveTextContent('No selection');
    expect(select.querySelector('option[value="alpha"]')).toHaveTextContent('Alpha, plate 1');
    expect(select.querySelector('option[value="beta"]')).toHaveTextContent('Beta, plate 2');
  });

  it('renders a multiple select synchronized with the selection', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        selectedCities={[alpha.id]}
        a11yFallback
      />,
    );
    const select = getFallbackSelect(container);
    const selectedValues = Array.from(select.selectedOptions).map((option) => option.value);

    expect(select).toHaveAttribute('multiple');
    expect(selectedValues).toEqual([alpha.id]);
  });

  it('marks disabled provinces as disabled options', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        disabledCities={[alpha.id]}
        a11yFallback
      />,
    );
    const select = getFallbackSelect(container);

    expect(select.querySelector('option[value="alpha"]')).toBeDisabled();
    expect(select.querySelector('option[value="beta"]')).not.toBeDisabled();
  });

  it('updates the fallback when the controlled value changes', () => {
    const { container, rerender } = render(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        selectedCity={alpha.id}
        a11yFallback
      />,
    );

    expect(getFallbackSelect(container).value).toBe(alpha.id);

    rerender(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        selectedCity={beta.id}
        a11yFallback
      />,
    );

    expect(getFallbackSelect(container).value).toBe(beta.id);
  });

  it('routes single fallback changes through the selection callbacks', () => {
    const onSelect = jest.fn();
    const onSelectionChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        a11yFallback
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.change(getFallbackSelect(container), { target: { value: beta.id } });

    expect(onSelect).toHaveBeenCalledWith(beta);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith([beta]);
    expect(selectedNames(container)).toEqual(['Beta']);
  });

  it('clears a single selection through the empty option', () => {
    const onSelectionChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        defaultSelectedCity={alpha.id}
        a11yFallback
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.change(getFallbackSelect(container), { target: { value: '' } });

    expect(onSelectionChange).toHaveBeenCalledWith([]);
    expect(selectedNames(container)).toEqual([]);
  });

  it('applies multiple selection limits and reports rejected cities', () => {
    const onSelect = jest.fn();
    const onSelectionChange = jest.fn();
    const onMaxSelectionReached = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={threeCities}
        selectionMode="multiple"
        maxSelection={2}
        a11yFallback
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
        onMaxSelectionReached={onMaxSelectionReached}
      />,
    );

    changeMultipleSelect(getFallbackSelect(container), [alpha.id, beta.id, gamma.id]);

    expect(selectedNames(container)).toEqual(['Alpha', 'Beta']);
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect.mock.calls.map(([city]) => city.id)).toEqual([alpha.id, beta.id]);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onMaxSelectionReached).toHaveBeenCalledWith(gamma, [alpha, beta], 2);
  });

  it('warns when a multiple fallback change exceeds the limit without a callback', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { container } = render(
      <TurkeyMap
        data={threeCities}
        selectionMode="multiple"
        maxSelection={1}
        a11yFallback
      />,
    );

    changeMultipleSelect(getFallbackSelect(container), [alpha.id, beta.id]);

    expect(selectedNames(container)).toEqual(['Alpha']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('maximum selection'));
  });

  it('keeps the fallback inert when the requested value does not change', () => {
    const onSelectionChange = jest.fn();
    const onSelect = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        selectedCity={alpha.id}
        a11yFallback
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.change(getFallbackSelect(container), { target: { value: alpha.id } });

    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('announces deselection from the multiple fallback', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        defaultSelectedCities={[alpha.id, beta.id]}
        a11yFallback
      />,
    );

    changeMultipleSelect(getFallbackSelect(container), [alpha.id]);

    expect(selectedNames(container)).toEqual(['Alpha']);
    expect(getLiveRegion(container)).toHaveTextContent('Beta, plate 2, not selected');
  });

  it('ignores keyboard events from wrapped non-path children', () => {
    const onClick = jest.fn();
    const cityWrapper = (cityComponent: React.ReactElement, city: CityType) => (
      React.cloneElement(cityComponent, {}, <rect data-testid={`wrapped-${city.id}`} />)
    );
    const { container } = render(
      <TurkeyMap data={testData} cityWrapper={cityWrapper} onClick={onClick} />,
    );
    const wrapped = container.querySelector('[data-testid="wrapped-alpha"]') as Element;

    fireEvent.keyDown(wrapped, { key: 'Enter' });
    fireEvent.keyDown(wrapped, { key: 'ArrowRight' });

    expect(onClick).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(getCityGroup(container, 'Beta'));
  });

  it('preserves existing selections when capping a multiple fallback change', () => {
    const onSelectionChange = jest.fn();
    const onMaxSelectionReached = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={threeCities}
        selectionMode="multiple"
        defaultSelectedCities={[gamma.id]}
        maxSelection={2}
        a11yFallback
        onSelectionChange={onSelectionChange}
        onMaxSelectionReached={onMaxSelectionReached}
      />,
    );

    changeMultipleSelect(getFallbackSelect(container), [alpha.id, beta.id, gamma.id]);

    expect(selectedNames(container)).toEqual(['Alpha', 'Gamma']);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onMaxSelectionReached).toHaveBeenCalledWith(beta, [alpha, gamma], 2);
  });

  it('does not mutate a controlled value changed through the fallback', () => {
    const onSelectionChange = jest.fn();
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        selectedCity={alpha.id}
        a11yFallback
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.change(getFallbackSelect(container), { target: { value: beta.id } });

    expect(onSelectionChange).toHaveBeenCalledWith([beta]);
    expect(getFallbackSelect(container).value).toBe(alpha.id);
    expect(selectedNames(container)).toEqual(['Alpha']);
  });

  it('warns and renders nothing when enabled in none mode', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { container } = render(<TurkeyMap data={testData} a11yFallback />);

    expect(container.querySelector('select')).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('a11yFallback'));
  });

  it('keeps the map roles and names unchanged when the fallback is enabled', () => {
    const { container } = render(
      <TurkeyMap data={testData} selectionMode="single" a11yFallback />,
    );

    expect(getProvinceContainer(container)).toHaveAttribute('role', 'listbox');
    expect(getCityGroup(container, 'Alpha')).toHaveAttribute('role', 'option');
    expect(getCityGroup(container, 'Alpha')).toHaveAttribute('tabindex', '0');
  });
});

describe('TurkeyMap accessibility reduced motion', () => {
  it('disables the tooltip fade under prefers-reduced-motion', () => {
    const { container } = render(
      <TurkeyMap data={testData} showTooltip={true} />,
    );
    const style = container.querySelector('style');

    expect(style).toHaveTextContent('@media (prefers-reduced-motion: reduce)');
    expect(style).toHaveTextContent('animation: none !important');
  });

  it('does not render motion rules when the tooltip is disabled', () => {
    const { container } = render(<TurkeyMap data={testData} />);

    expect(container.querySelector('style')).toBeNull();
  });
});

describe('TurkeyMap accessibility axe checks', () => {
  it('passes axe in none, single, and multiple modes', async () => {
    const none = render(<TurkeyMap data={testData} />);
    expect(await axe(none.container)).toHaveNoViolations();
    none.unmount();

    const single = render(<TurkeyMap data={testData} selectionMode="single" />);
    expect(await axe(single.container)).toHaveNoViolations();
    single.unmount();

    const multiple = render(<TurkeyMap data={testData} selectionMode="multiple" />);
    expect(await axe(multiple.container)).toHaveNoViolations();
  });

  it('passes axe with the fallback and disabled provinces', async () => {
    const { container } = render(
      <TurkeyMap
        data={[disabledAlpha, beta]}
        selectionMode="multiple"
        selectedCities={[alpha.id]}
        a11yFallback
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
