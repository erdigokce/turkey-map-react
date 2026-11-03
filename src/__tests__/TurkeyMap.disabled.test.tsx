import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import {
  alpha,
  beta,
  customDisabledData,
  testData,
} from '../../tests/fixtures/cities';
import {
  getCityGroup,
  getCityGroups,
  getCityPath,
  getTooltip,
} from '../../tests/helpers';

const generalStroke = 'var(--tm-stroke-color, none)';

const selectedNames = (container: HTMLElement): string[] => (
  getCityGroups(container)
    .filter((group) => getCityPath(group).style.stroke !== generalStroke)
    .map((group) => group.getAttribute('data-iladi') ?? '')
);

const disabledNames = (container: HTMLElement): string[] => (
  getCityGroups(container)
    .filter((group) => group.getAttribute('aria-disabled') === 'true')
    .map((group) => group.getAttribute('data-iladi') ?? '')
);

describe('TurkeyMap disabled cities', () => {
  describe('disabled sources', () => {
    it('disables cities listed in disabledCities on the built-in data', () => {
      const { container } = render(
        <TurkeyMap disabledCities={['hakkari', 'sirnak']} />,
      );

      expect(getCityGroup(container, 'Hakkâri')).toHaveAttribute('aria-disabled', 'true');
      expect(getCityGroup(container, 'Şırnak')).toHaveAttribute('aria-disabled', 'true');
      expect(getCityGroup(container, 'Ankara')).not.toHaveAttribute('aria-disabled');
      expect(disabledNames(container)).toEqual(['Hakkâri', 'Şırnak']);
    });

    it('disables cities through the predicate with custom data', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          isCityDisabled={(city) => city.name === 'Alpha'}
        />,
      );

      expect(getCityGroup(container, 'Alpha')).toHaveAttribute('aria-disabled', 'true');
      expect(getCityGroup(container, 'Beta')).not.toHaveAttribute('aria-disabled');
    });

    it('disables cities flagged disabled in custom data', () => {
      const { container } = render(<TurkeyMap data={customDisabledData} />);

      expect(getCityGroup(container, 'Alpha')).toHaveAttribute('aria-disabled', 'true');
      expect(getCityGroup(container, 'Beta')).not.toHaveAttribute('aria-disabled');
    });

    it('combines sources additively when the predicate returns false', () => {
      const { container } = render(
        <TurkeyMap
          data={customDisabledData}
          isCityDisabled={() => false}
        />,
      );

      expect(getCityGroup(container, 'Alpha')).toHaveAttribute('aria-disabled', 'true');
    });

    it('tolerates duplicate ids without changing behavior', () => {
      const { container } = render(
        <TurkeyMap data={testData} disabledCities={[alpha.id, alpha.id]} />,
      );

      expect(getCityGroup(container, 'Alpha')).toHaveAttribute('aria-disabled', 'true');
      expect(getCityGroup(container, 'Beta')).not.toHaveAttribute('aria-disabled');
    });

    it('ignores unknown ids without throwing', () => {
      expect(() => render(
        <TurkeyMap data={testData} disabledCities={['missing', alpha.id]} />,
      )).not.toThrow();

      const { container } = render(
        <TurkeyMap data={testData} disabledCities={['missing', alpha.id]} />,
      );

      expect(getCityGroup(container, 'Alpha')).toHaveAttribute('aria-disabled', 'true');
      expect(getCityGroup(container, 'Beta')).not.toHaveAttribute('aria-disabled');
      expect(disabledNames(container)).toEqual(['Alpha']);
    });

    it('leaves the default map unchanged when nothing is disabled', () => {
      const { container } = render(<TurkeyMap data={testData} />);

      expect(disabledNames(container)).toEqual([]);
      expect(getCityPath(getCityGroup(container, 'Alpha')).getAttribute('style'))
        .toBe(
          'cursor: pointer; fill: var(--tm-idle-color, #444); '
          + 'stroke: var(--tm-stroke-color, none); stroke-width: var(--tm-stroke-width, 0.5);',
        );
    });
  });

  describe('disabled rendering', () => {
    it('applies a custom disabled color while leaving enabled cities unchanged', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          disabledCities={[alpha.id]}
          customStyle={{
            idleColor: '#111111',
            hoverColor: '#222222',
            disabledColor: '#abcdef',
          }}
        />,
      );

      expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveStyle({
        fill: '#abcdef',
        cursor: 'not-allowed',
      });
      expect(getCityPath(getCityGroup(container, 'Beta'))).toHaveStyle({
        fill: '#111111',
        cursor: 'pointer',
      });
    });

    it('uses the default disabled color when disabledColor is omitted', () => {
      const { container } = render(
        <TurkeyMap data={testData} disabledCities={[alpha.id]} />,
      );

      expect(getCityPath(getCityGroup(container, 'Alpha')).style.fill)
        .toBe('var(--tm-disabled-color, #e5e5e5)');
    });

    it('does not highlight a disabled city on hover', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          disabledCities={[alpha.id]}
          customStyle={{ idleColor: '#111111', hoverColor: '#222222' }}
        />,
      );
      const group = getCityGroup(container, 'Alpha');
      const path = getCityPath(group);

      fireEvent.mouseEnter(group);
      expect(path.style.fill).toBe('var(--tm-disabled-color, #e5e5e5)');
      expect(path).toHaveStyle({ cursor: 'not-allowed' });

      fireEvent.mouseLeave(group);
      expect(path.style.fill).toBe('var(--tm-disabled-color, #e5e5e5)');
      expect(path).toHaveStyle({ cursor: 'not-allowed' });
    });

    it('keeps the disabled fill over selected styling and omits selected stroke', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          selectedCity={alpha.id}
          disabledCities={[alpha.id]}
          customStyle={{
            idleColor: '#111111',
            hoverColor: '#222222',
            selectedColor: '#333333',
            selectedStroke: '#444444',
            selectedStrokeWidth: 4,
            disabledColor: '#abcdef',
          }}
        />,
      );
      const path = getCityPath(getCityGroup(container, 'Alpha'));

      expect(path).toHaveStyle({ fill: '#abcdef', cursor: 'not-allowed' });
      expect(path.style.stroke).toBe(generalStroke);
      expect(path.style.strokeWidth).toBe('var(--tm-stroke-width, 0.5)');
    });

    it('keeps disabled styling across unrelated re-renders', () => {
      const { container, rerender } = render(
        <TurkeyMap data={testData} disabledCities={[alpha.id]} />,
      );

      rerender(
        <TurkeyMap
          data={testData}
          disabledCities={[alpha.id]}
          customStyle={{ idleColor: '#111111', hoverColor: '#222222', disabledColor: '#abcdef' }}
        />,
      );

      expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveStyle({
        fill: '#abcdef',
        cursor: 'not-allowed',
      });
    });

    it('keeps disabled cities in the DOM with their ids and data attributes', () => {
      const { container } = render(
        <TurkeyMap data={testData} disabledCities={[alpha.id]} />,
      );
      const group = getCityGroup(container, 'Alpha');

      expect(group).toHaveAttribute('id', 'alpha');
      expect(group).toHaveAttribute('data-plakakodu', '1');
      expect(group).toHaveAttribute('data-iladi', 'Alpha');
      expect(getCityPath(group)).toHaveAttribute('d', alpha.path);
    });

    it('renders aria-disabled only on disabled groups', () => {
      const { container } = render(
        <TurkeyMap data={testData} disabledCities={[alpha.id]} />,
      );

      expect(getCityGroup(container, 'Alpha')).toHaveAttribute('aria-disabled', 'true');
      expect(getCityGroup(container, 'Beta')).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('interaction suppression', () => {
    it('ignores clicks on disabled cities and leaves the selection unchanged', () => {
      const onClick = jest.fn();
      const onSelect = jest.fn();
      const onSelectionChange = jest.fn();
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          defaultSelectedCities={[beta.id]}
          disabledCities={[alpha.id]}
          onClick={onClick}
          onSelect={onSelect}
          onSelectionChange={onSelectionChange}
        />,
      );

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));

      expect(onClick).not.toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
      expect(onSelectionChange).not.toHaveBeenCalled();
      expect(selectedNames(container)).toEqual(['Beta']);
    });

    it('does not report hover for disabled cities but does for enabled neighbours', () => {
      const onHover = jest.fn();
      const { container } = render(
        <TurkeyMap data={testData} disabledCities={[alpha.id]} onHover={onHover} />,
      );

      fireEvent.mouseOver(getCityPath(getCityGroup(container, 'Alpha')));
      expect(onHover).not.toHaveBeenCalled();

      fireEvent.mouseOver(getCityPath(getCityGroup(container, 'Beta')));
      expect(onHover).toHaveBeenCalledTimes(1);
      expect(onHover).toHaveBeenCalledWith(beta);
    });

    it('ignores Enter and Space on a focused disabled city', () => {
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
      const group = getCityGroup(container, 'Alpha');

      fireEvent.keyDown(group, { key: 'Enter' });
      fireEvent.keyDown(group, { key: ' ' });

      expect(selectedNames(container)).toEqual([]);
      expect(onSelect).not.toHaveBeenCalled();
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it('keeps the existing multiple selection when a disabled city is clicked', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          defaultSelectedCities={[beta.id]}
          disabledCities={[alpha.id]}
        />,
      );

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));

      expect(selectedNames(container)).toEqual(['Beta']);
    });

    it('keeps clicks, hover, and keyboard working on enabled neighbours', () => {
      const onClick = jest.fn();
      const onHover = jest.fn();
      const onSelect = jest.fn();
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          disabledCities={[alpha.id]}
          onClick={onClick}
          onHover={onHover}
          onSelect={onSelect}
        />,
      );
      const betaPath = getCityPath(getCityGroup(container, 'Beta'));

      fireEvent.mouseOver(betaPath);
      fireEvent.click(betaPath);

      expect(onHover).toHaveBeenCalledWith(beta);
      expect(onClick).toHaveBeenCalledWith(beta);
      expect(onSelect).toHaveBeenCalledWith(beta);
      expect(selectedNames(container)).toEqual(['Beta']);
    });
  });

  describe('selection coexistence', () => {
    it('keeps a selected city selected when it becomes disabled', () => {
      const onSelectionChange = jest.fn();
      const { container, rerender } = render(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          selectedCity={alpha.id}
          onSelectionChange={onSelectionChange}
        />,
      );

      expect(selectedNames(container)).toEqual(['Alpha']);

      rerender(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          selectedCity={alpha.id}
          disabledCities={[alpha.id]}
          onSelectionChange={onSelectionChange}
        />,
      );

      expect(getCityPath(getCityGroup(container, 'Alpha')).style.fill)
        .toBe('var(--tm-disabled-color, #e5e5e5)');
      expect(getCityPath(getCityGroup(container, 'Alpha')))
        .toHaveStyle({ cursor: 'not-allowed' });
      expect(selectedNames(container)).toEqual([]);
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it('restores normal interaction when a city is re-enabled', () => {
      const onSelect = jest.fn();
      const { container, rerender } = render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          disabledCities={[alpha.id]}
          onSelect={onSelect}
        />,
      );

      rerender(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          onSelect={onSelect}
        />,
      );

      expect(selectedNames(container)).toEqual([]);

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));

      expect(selectedNames(container)).toEqual(['Alpha']);
      expect(onSelect).toHaveBeenCalledWith(alpha);
    });

    it('renders controlled selection values containing disabled cities as supplied', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          selectedCities={[alpha.id, beta.id]}
          disabledCities={[alpha.id]}
        />,
      );

      expect(getCityPath(getCityGroup(container, 'Alpha')).style.fill)
        .toBe('var(--tm-disabled-color, #e5e5e5)');
      expect(selectedNames(container)).toEqual(['Beta']);
      expect(getCityGroup(container, 'Alpha')).toBeInTheDocument();
    });

    it('retains a disabled selected city in onSelectionChange payloads', () => {
      const onSelectionChange = jest.fn();
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          selectedCities={[alpha.id]}
          disabledCities={[alpha.id]}
          onSelectionChange={onSelectionChange}
        />,
      );

      fireEvent.click(getCityPath(getCityGroup(container, 'Beta')));

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange.mock.calls[0][0].map((city: { id: string }) => city.id))
        .toEqual(['alpha', 'beta']);
    });
  });

  describe('keyboard and tooltip', () => {
    it('focuses disabled cities in selection mode and shows the focus outline', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          disabledCities={[alpha.id]}
        />,
      );
      const group = getCityGroup(container, 'Alpha');

      expect(group).toHaveAttribute('tabindex', '-1');
      expect(getCityGroup(container, 'Beta')).toHaveAttribute('tabindex', '0');

      fireEvent.focus(group);
      expect(group.style.outline).toBe('2px solid #1a73e8');
      expect(group.style.outlineColor).toBe('var(--tm-focus-ring, #1a73e8)');
      expect(group.style.outlineOffset).toBe('2px');

      fireEvent.blur(group);
      expect(group.style.outline).toBe('');
    });

    it('adds the accessible roving tab stop in none mode', () => {
      const { container } = render(
        <TurkeyMap data={testData} disabledCities={[alpha.id]} />,
      );

      expect(getCityGroup(container, 'Alpha')).toHaveAttribute('tabindex', '-1');
      expect(getCityGroup(container, 'Beta')).toHaveAttribute('tabindex', '0');
    });

    it('shows the custom disabled tooltip text', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          showTooltip={true}
          disabledTooltipText="Not available"
          disabledCities={[alpha.id]}
        />,
      );

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));

      expect(getTooltip(container)).toHaveTextContent('Not available');
    });

    it('falls back to the city name for a disabled tooltip', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          showTooltip={true}
          disabledCities={[alpha.id]}
        />,
      );

      fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));

      expect(getTooltip(container)).toHaveTextContent('Alpha');
    });

    it('leaves enabled tooltips unchanged when disabled text is supplied', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          showTooltip={true}
          tooltipText="Custom text"
          disabledTooltipText="Not available"
          disabledCities={[alpha.id]}
        />,
      );

      fireEvent.mouseEnter(getCityGroup(container, 'Beta'));

      expect(getTooltip(container)).toHaveTextContent('Custom text');
      expect(getTooltip(container)).not.toHaveTextContent('Not available');
    });
  });
});
