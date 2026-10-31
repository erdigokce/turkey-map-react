import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap, { CityType } from '../index';
import { alpha, beta, testCities, testData } from '../../tests/fixtures/cities';
import { getCityGroup, getCityGroups, getCityPath } from '../../tests/helpers';

const gamma: CityType = {
  id: 'gamma',
  plateNumber: 3,
  name: 'Gamma',
  path: 'M 40 40 L 50 50 L 40 50 Z',
};

const threeCities = {
  cities: [...testCities, gamma],
};

const isSelected = (container: HTMLElement, name: string): boolean => (
  getCityPath(getCityGroup(container, name)).style.stroke !== ''
);

const selectedNames = (container: HTMLElement): string[] => (
  getCityGroups(container)
    .filter((group) => getCityPath(group).style.stroke !== '')
    .map((group) => group.getAttribute('data-iladi') ?? '')
);

describe('TurkeyMap selection', () => {
  describe('single mode', () => {
    it('selects a controlled city, replaces it, and clears with null', () => {
      const { container, rerender } = render(
        <TurkeyMap data={testData} selectionMode="single" selectedCity={alpha.id} />,
      );

      expect(selectedNames(container)).toEqual(['Alpha']);

      rerender(
        <TurkeyMap data={testData} selectionMode="single" selectedCity={beta.id} />,
      );
      expect(selectedNames(container)).toEqual(['Beta']);

      rerender(
        <TurkeyMap data={testData} selectionMode="single" selectedCity={null} />,
      );
      expect(selectedNames(container)).toEqual([]);
    });

    it('replaces an uncontrolled selection and reports only the new city', () => {
      const onSelectionChange = jest.fn();
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          onSelectionChange={onSelectionChange}
        />,
      );

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
      fireEvent.click(getCityPath(getCityGroup(container, 'Beta')));

      expect(selectedNames(container)).toEqual(['Beta']);
      expect(onSelectionChange).toHaveBeenCalledTimes(2);
      expect(onSelectionChange).toHaveBeenLastCalledWith([beta]);
    });

    it('is idempotent when the selected city is activated again', () => {
      const onSelect = jest.fn();
      const onSelectionChange = jest.fn();
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          onSelect={onSelect}
          onSelectionChange={onSelectionChange}
        />,
      );
      const path = getCityPath(getCityGroup(container, 'Alpha'));

      fireEvent.click(path);
      fireEvent.click(path);

      expect(selectedNames(container)).toEqual(['Alpha']);
      expect(onSelect).toHaveBeenCalledTimes(2);
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
    });

    it('initializes from defaultSelectedCity only once', () => {
      const { container, rerender } = render(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          defaultSelectedCity={alpha.id}
        />,
      );

      expect(selectedNames(container)).toEqual(['Alpha']);

      rerender(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          defaultSelectedCity={beta.id}
        />,
      );

      expect(selectedNames(container)).toEqual(['Alpha']);
    });

    it('ignores maxSelection because single mode holds at most one city', () => {
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          maxSelection={1}
        />,
      );

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
      fireEvent.click(getCityPath(getCityGroup(container, 'Beta')));

      expect(selectedNames(container)).toEqual(['Beta']);
    });
  });

  describe('multiple mode', () => {
    it('toggles cities on and off without firing onSelect on removal', () => {
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
      const alphaPath = getCityPath(getCityGroup(container, 'Alpha'));

      fireEvent.click(alphaPath);
      expect(selectedNames(container)).toEqual(['Alpha']);

      fireEvent.click(getCityPath(getCityGroup(container, 'Beta')));
      expect(selectedNames(container)).toEqual(['Alpha', 'Beta']);

      fireEvent.click(alphaPath);
      expect(selectedNames(container)).toEqual(['Beta']);
      expect(onSelect).toHaveBeenCalledTimes(2);
      expect(onSelectionChange).toHaveBeenLastCalledWith([beta]);
    });

    it('follows controlled updates and accepts an empty array as clearing', () => {
      const { container, rerender } = render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          selectedCities={[alpha.id]}
        />,
      );

      expect(selectedNames(container)).toEqual(['Alpha']);

      rerender(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          selectedCities={[beta.id, gamma.id, 'missing']}
        />,
      );
      expect(selectedNames(container)).toEqual(['Beta']);

      rerender(
        <TurkeyMap
          data={threeCities}
          selectionMode="multiple"
          selectedCities={[beta.id, gamma.id]}
        />,
      );
      expect(selectedNames(container)).toEqual(['Beta', 'Gamma']);

      rerender(
        <TurkeyMap
          data={threeCities}
          selectionMode="multiple"
          selectedCities={[]}
        />,
      );
      expect(selectedNames(container)).toEqual([]);
    });

    it('keeps uncontrolled selection across unrelated re-renders and data updates', () => {
      const { container, rerender } = render(
        <TurkeyMap data={testData} selectionMode="multiple" />,
      );

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
      expect(selectedNames(container)).toEqual(['Alpha']);

      rerender(
        <TurkeyMap data={testData} selectionMode="multiple" hoverable={false} />,
      );
      expect(selectedNames(container)).toEqual(['Alpha']);

      rerender(
        <TurkeyMap
          data={{ cities: [...testCities] }}
          selectionMode="multiple"
          hoverable={false}
        />,
      );
      expect(selectedNames(container)).toEqual(['Alpha']);
    });

    it('initializes from defaultSelectedCities only once and de-duplicates it', () => {
      const { container, rerender } = render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          defaultSelectedCities={[alpha.id, alpha.id]}
        />,
      );

      expect(selectedNames(container)).toEqual(['Alpha']);

      rerender(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          defaultSelectedCities={[beta.id]}
        />,
      );

      expect(selectedNames(container)).toEqual(['Alpha']);
    });

    it('de-duplicates controlled ids while preserving first-occurrence order', () => {
      const onSelectionChange = jest.fn();
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          selectedCities={[beta.id, alpha.id, beta.id]}
          onSelectionChange={onSelectionChange}
        />,
      );

      expect(selectedNames(container)).toEqual(['Alpha', 'Beta']);

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
      expect(onSelectionChange).toHaveBeenCalledWith([beta]);
    });

    it('filters unknown ids from callbacks without throwing', () => {
      const onSelectionChange = jest.fn();
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          selectedCities={['missing', alpha.id]}
          onSelectionChange={onSelectionChange}
        />,
      );

      fireEvent.click(getCityPath(getCityGroup(container, 'Beta')));

      expect(onSelectionChange).toHaveBeenCalledWith([alpha, beta]);
    });
  });

  describe('maxSelection', () => {
    it('ignores an overflow attempt and does not report a change', () => {
      const onSelectionChange = jest.fn();
      const { container } = render(
        <TurkeyMap
          data={threeCities}
          selectionMode="multiple"
          maxSelection={2}
          onSelectionChange={onSelectionChange}
        />,
      );

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
      fireEvent.click(getCityPath(getCityGroup(container, 'Beta')));
      expect(onSelectionChange).toHaveBeenCalledTimes(2);

      fireEvent.click(getCityPath(getCityGroup(container, 'Gamma')));

      expect(selectedNames(container)).toEqual(['Alpha', 'Beta']);
      expect(onSelectionChange).toHaveBeenCalledTimes(2);
    });

    it('calls onMaxSelectionReached with the attempted city, selection, and limit', () => {
      const onMaxSelectionReached = jest.fn();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { container } = render(
        <TurkeyMap
          data={threeCities}
          selectionMode="multiple"
          maxSelection={1}
          onMaxSelectionReached={onMaxSelectionReached}
        />,
      );

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
      fireEvent.click(getCityPath(getCityGroup(container, 'Beta')));

      expect(onMaxSelectionReached).toHaveBeenCalledWith(beta, [alpha], 1);
      expect(warn).not.toHaveBeenCalled();
    });

    it('warns in development when the default overflow handling runs', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { container } = render(
        <TurkeyMap data={testData} selectionMode="multiple" maxSelection={1} />,
      );

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
      fireEvent.click(getCityPath(getCityGroup(container, 'Beta')));

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('maximum selection'));
      expect(selectedNames(container)).toEqual(['Alpha']);
    });

    it('allows removing a city while at the cap', () => {
      const { container } = render(
        <TurkeyMap data={testData} selectionMode="multiple" maxSelection={2} />,
      );

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
      fireEvent.click(getCityPath(getCityGroup(container, 'Beta')));
      expect(selectedNames(container)).toEqual(['Alpha', 'Beta']);

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
      expect(selectedNames(container)).toEqual(['Beta']);
    });

    it('ignores an invalid limit and warns', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { container } = render(
        <TurkeyMap
          data={threeCities}
          selectionMode="multiple"
          maxSelection={0}
        />,
      );

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('maxSelection must be a positive integer'));

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
      fireEvent.click(getCityPath(getCityGroup(container, 'Beta')));
      fireEvent.click(getCityPath(getCityGroup(container, 'Gamma')));

      expect(selectedNames(container)).toEqual(['Alpha', 'Beta', 'Gamma']);
    });
  });

  describe('callbacks', () => {
    it('reports full CityType objects in both modes', () => {
      const singleSelect = jest.fn();
      const singleChange = jest.fn();
      const single = render(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          onSelect={singleSelect}
          onSelectionChange={singleChange}
        />,
      );

      fireEvent.click(getCityPath(getCityGroup(single.container, 'Alpha')));
      expect(singleSelect).toHaveBeenLastCalledWith(alpha);
      expect(singleChange).toHaveBeenLastCalledWith([alpha]);

      const multipleSelect = jest.fn();
      const multipleChange = jest.fn();
      const multiple = render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          onSelect={multipleSelect}
          onSelectionChange={multipleChange}
        />,
      );

      fireEvent.click(getCityPath(getCityGroup(multiple.container, 'Beta')));
      expect(multipleSelect).toHaveBeenLastCalledWith(beta);
      expect(multipleChange).toHaveBeenLastCalledWith([beta]);
    });

    it('uses the latest callback references after a re-render', () => {
      const firstSelect = jest.fn();
      const firstChange = jest.fn();
      const secondSelect = jest.fn();
      const secondChange = jest.fn();
      const { container, rerender } = render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          onSelect={firstSelect}
          onSelectionChange={firstChange}
        />,
      );

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
      expect(firstSelect).toHaveBeenCalledTimes(1);
      expect(firstChange).toHaveBeenCalledTimes(1);

      rerender(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          onSelect={secondSelect}
          onSelectionChange={secondChange}
        />,
      );
      fireEvent.click(getCityPath(getCityGroup(container, 'Beta')));

      expect(secondSelect).toHaveBeenCalledWith(beta);
      expect(secondChange).toHaveBeenLastCalledWith([alpha, beta]);
      expect(firstSelect).toHaveBeenCalledTimes(1);
      expect(firstChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('opt-in behavior', () => {
    it('keeps onClick and onHover active in selection mode', () => {
      const onClick = jest.fn();
      const onHover = jest.fn();
      const onSelect = jest.fn();
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectionMode="single"
          onClick={onClick}
          onHover={onHover}
          onSelect={onSelect}
        />,
      );
      const path = getCityPath(getCityGroup(container, 'Alpha'));

      fireEvent.mouseOver(path);
      fireEvent.click(path);

      expect(onHover).toHaveBeenCalledWith(alpha);
      expect(onClick).toHaveBeenCalledWith(alpha);
      expect(onSelect).toHaveBeenCalledWith(alpha);
    });

    it('does not select when the click target is the city group', () => {
      const { container } = render(
        <TurkeyMap data={testData} selectionMode="single" />,
      );

      fireEvent.click(getCityGroup(container, 'Alpha'));

      expect(selectedNames(container)).toEqual([]);
    });

    it('ignores selection props in none mode', () => {
      const onSelect = jest.fn();
      const onSelectionChange = jest.fn();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { container } = render(
        <TurkeyMap
          data={testData}
          selectedCity={alpha.id}
          defaultSelectedCities={[beta.id]}
          onSelect={onSelect}
          onSelectionChange={onSelectionChange}
        />,
      );

      fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));

      expect(selectedNames(container)).toEqual([]);
      expect(onSelect).not.toHaveBeenCalled();
      expect(onSelectionChange).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('selection props require selectionMode'));
    });
  });
});
