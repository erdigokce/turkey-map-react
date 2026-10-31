import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import { alpha, beta, testData } from '../../tests/fixtures/cities';
import { getCityGroup, getCityGroups, getCityPath } from '../../tests/helpers';

const selectedNames = (container: HTMLElement): string[] => (
  getCityGroups(container)
    .filter((group) => getCityPath(group).style.stroke !== '')
    .map((group) => group.getAttribute('data-iladi') ?? '')
);

describe('TurkeyMap selection rendering', () => {
  it('keeps the default path style unchanged when nothing is selected', () => {
    const { container } = render(<TurkeyMap data={testData} />);
    const path = getCityPath(getCityGroup(container, 'Alpha'));

    expect(path.getAttribute('style')).toBe('cursor: pointer; fill: #444;');
  });

  it('prefers selected styling over hover styling and restores idle on deselect', () => {
    const { container, rerender } = render(
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

    fireEvent.mouseEnter(getCityGroup(container, 'Alpha'));
    expect(alphaPath).toHaveStyle({ fill: '#333333' });
    expect(betaPath).toHaveStyle({ fill: '#111111' });

    fireEvent.mouseEnter(getCityGroup(container, 'Beta'));
    expect(alphaPath).toHaveStyle({ fill: '#333333' });
    expect(betaPath).toHaveStyle({ fill: '#222222' });

    fireEvent.mouseLeave(getCityGroup(container, 'Beta'));
    expect(betaPath).toHaveStyle({ fill: '#111111' });
    expect(alphaPath).toHaveStyle({ fill: '#333333' });

    rerender(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        selectedCity={null}
        customStyle={{
          idleColor: '#111111',
          hoverColor: '#222222',
          selectedColor: '#333333',
        }}
      />,
    );

    expect(alphaPath).toHaveStyle({ fill: '#111111' });
    expect(alphaPath.style.stroke).toBe('');
  });

  it('applies custom selected colors, stroke, and stroke width only to selected paths', () => {
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        selectedCities={[alpha.id]}
        customStyle={{
          idleColor: '#111111',
          hoverColor: '#222222',
          selectedColor: '#333333',
          selectedStroke: '#444444',
          selectedStrokeWidth: 4,
        }}
      />,
    );

    expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveStyle({
      fill: '#333333',
      stroke: '#444444',
      strokeWidth: 4,
    });
    expect(getCityPath(getCityGroup(container, 'Beta'))).toHaveStyle({
      fill: '#111111',
    });
    expect(getCityPath(getCityGroup(container, 'Beta')).style.stroke).toBe('');
  });

  it('keeps selection across unrelated re-renders and customStyle changes', () => {
    const { container, rerender } = render(
      <TurkeyMap data={testData} selectionMode="single" selectedCity={alpha.id} />,
    );

    rerender(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        selectedCity={alpha.id}
        customStyle={{ idleColor: '#111111', hoverColor: '#222222' }}
      />,
    );

    expect(selectedNames(container)).toEqual(['Alpha']);
    expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveStyle({
      fill: '#dc3522',
    });
  });

  it('keeps uncontrolled selection across customStyle changes', () => {
    const { container, rerender } = render(
      <TurkeyMap data={testData} selectionMode="multiple" />,
    );

    fireEvent.click(getCityPath(getCityGroup(container, 'Alpha')));
    rerender(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        customStyle={{ idleColor: '#111111', hoverColor: '#222222', selectedColor: '#333333' }}
      />,
    );

    expect(selectedNames(container)).toEqual(['Alpha']);
    expect(getCityPath(getCityGroup(container, 'Alpha'))).toHaveStyle({
      fill: '#333333',
    });
  });
});

describe('TurkeyMap selection keyboard support', () => {
  it('adds tab stops and activates with Enter and Space', () => {
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
    const group = getCityGroup(container, 'Alpha');

    expect(group).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(group, { key: 'Enter' });
    expect(selectedNames(container)).toEqual(['Alpha']);

    fireEvent.keyDown(group, { key: ' ' });
    expect(selectedNames(container)).toEqual([]);

    fireEvent.keyDown(group, { key: 'a' });
    expect(selectedNames(container)).toEqual([]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
  });

  it('shows a visible focus outline and clears it on blur', () => {
    const { container } = render(
      <TurkeyMap data={testData} selectionMode="single" />,
    );
    const group = getCityGroup(container, 'Alpha');

    fireEvent.focus(group);
    expect(group.style.outline).toBe('2px solid #1a73e8');
    expect(group.style.outlineOffset).toBe('2px');

    fireEvent.blur(group);
    expect(group.style.outline).toBe('');
    expect(group.style.outlineOffset).toBe('');
  });

  it('adds no keyboard stops or keyboard selection in none mode', () => {
    const { container } = render(<TurkeyMap data={testData} />);
    const group = getCityGroup(container, 'Alpha');

    expect(group).not.toHaveAttribute('tabindex');

    fireEvent.keyDown(group, { key: 'Enter' });
    fireEvent.focus(group);

    expect(selectedNames(container)).toEqual([]);
    expect(group.style.outline).toBe('');
  });
});

describe('TurkeyMap selection diagnostics', () => {
  it('warns when controlled and default props are both supplied', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        selectedCity={alpha.id}
        defaultSelectedCity={beta.id}
      />,
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('defaultSelectedCity'));
  });

  it('warns when multiple controlled and default props are both supplied', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        selectedCities={[alpha.id]}
        defaultSelectedCities={[beta.id]}
      />,
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('defaultSelectedCities'));
  });

  it('warns about single-mode props used in multiple mode', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        selectedCity={alpha.id}
      />,
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('single selection props are ignored'));
  });

  it('warns about multiple-mode props used in single mode', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(
      <TurkeyMap
        data={testData}
        selectionMode="single"
        selectedCities={[alpha.id]}
      />,
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('multiple selection props are ignored'));
  });

  it('renders an oversized controlled selection and warns once', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { container } = render(
      <TurkeyMap
        data={testData}
        selectionMode="multiple"
        selectedCities={[alpha.id, beta.id]}
        maxSelection={1}
      />,
    );

    expect(selectedNames(container)).toEqual(['Alpha', 'Beta']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('exceeds maxSelection'));
  });

  it('is quiet in production builds', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      render(
        <TurkeyMap
          data={testData}
          selectionMode="multiple"
          selectedCities={[alpha.id, beta.id]}
          defaultSelectedCities={[alpha.id]}
          maxSelection={1}
        />,
      );

      expect(warn).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
