import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap, { useTurkeyMap } from '../index';
import { useTurkeyMap as coreUseTurkeyMap } from '../core';
import type {
  CityType,
  Data,
  UseTurkeyMapOptions,
} from '../index';
import { alpha, beta, testCities, testData } from '../../tests/fixtures/cities';
import { getCityGroup, getCityPath } from '../../tests/helpers';
import { installPointerEvent } from '../../tests/tooltip-helpers';

const gamma: CityType = {
  id: 'gamma',
  plateNumber: 3,
  name: 'Gamma',
  path: 'M 40 40 L 50 50 L 40 50 Z',
};

const threeData: Data = { cities: [...testCities, gamma] };

type HeadlessOptions = Omit<UseTurkeyMapOptions, 'data'> & {
  data: Data;
  applyIds?: string[];
};

const HeadlessMap = ({
  data,
  applyIds = [],
  ...options
}: HeadlessOptions) => {
  const {
    getContainerProps,
    getCityProps,
    getTooltipProps,
    selectedCities,
    announcement,
    tooltipCity,
    isCityDisabled,
    activateCity,
    changeSelection,
    clearSelection,
  } = useTurkeyMap({ data, ...options });

  return (
    <div>
      <div data-testid="headless-container" {...getContainerProps()}>
        {data.cities.map((city) => (
          <div
            key={city.id}
            data-testid={`city-${city.id}`}
            {...getCityProps(city)}
          >
            {city.name}
          </div>
        ))}
      </div>
      <div data-testid="selected">{selectedCities.map((city) => city.id).join(',')}</div>
      <div data-testid="disabled">{data.cities.filter(isCityDisabled).map((city) => city.id).join(',')}</div>
      <div data-testid="live">{announcement}</div>
      <div data-testid="tooltip" {...getTooltipProps()}>{tooltipCity?.name}</div>
      <button type="button" data-testid="apply" onClick={() => changeSelection(applyIds)}>
        apply
      </button>
      <button type="button" data-testid="clear" onClick={clearSelection}>
        clear
      </button>
      <button
        type="button"
        data-testid="activate"
        onClick={() => activateCity(data.cities[0])}
      >
        activate
      </button>
    </div>
  );
};

const HeadlessSvgMap = ({ data }: { data: Data }) => {
  const { getContainerProps, getCityProps } = useTurkeyMap({ data, selectionMode: 'single' });

  return (
    <svg data-testid="headless-svg" {...getContainerProps()}>
      {data.cities.map((city) => (
        <path
          key={city.id}
          data-testid={`svg-city-${city.id}`}
          d={city.path}
          {...getCityProps(city)}
        />
      ))}
    </svg>
  );
};

describe('useTurkeyMap', () => {
  it('is exported from both entries', () => {
    expect(coreUseTurkeyMap).toBe(useTurkeyMap);
  });

  it('renders only consumer markup and exposes container and city ARIA props', () => {
    const onHover = jest.fn();
    const onClick = jest.fn();
    render(
      <HeadlessMap
        data={testData}
        selectionMode="multiple"
        onHover={onHover}
        onClick={onClick}
      />,
    );

    expect(document.querySelector('#svg-turkiye-haritasi')).toBeNull();
    const container = screen.getByTestId('headless-container');
    expect(container).toHaveAttribute('role', 'listbox');
    expect(container).toHaveAttribute('aria-label', 'Turkey map');
    expect(container).toHaveAttribute('aria-multiselectable', 'true');
    expect(container).toHaveAttribute('data-tm-map-container', 'true');

    const alphaCity = screen.getByTestId('city-alpha');
    expect(alphaCity).toHaveAttribute('role', 'option');
    expect(alphaCity).toHaveAttribute('aria-label', 'Alpha, plate 1');
    expect(alphaCity).toHaveAttribute('aria-selected', 'false');
    expect(alphaCity).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('city-beta')).toHaveAttribute('tabindex', '-1');

    fireEvent.mouseOver(alphaCity);
    expect(onHover).toHaveBeenCalledWith(alpha, expect.anything());

    fireEvent.click(alphaCity);
    expect(onClick).toHaveBeenCalledWith(alpha, expect.anything());
    expect(screen.getByTestId('selected')).toHaveTextContent('alpha');
    expect(alphaCity).toHaveAttribute('aria-selected', 'true');
  });

  it('supports localized labels and the three container modes', () => {
    const { rerender } = render(
      <HeadlessMap data={testData} ariaLabel="Türkiye haritası" />,
    );
    let container = screen.getByTestId('headless-container');
    expect(container).toHaveAttribute('role', 'group');
    expect(container).toHaveAttribute('aria-label', 'Türkiye haritası');
    expect(container).not.toHaveAttribute('aria-multiselectable');

    rerender(<HeadlessMap data={testData} selectionMode="single" ariaLabel="Türkiye haritası" />);
    container = screen.getByTestId('headless-container');
    expect(container).toHaveAttribute('role', 'listbox');
    expect(container).not.toHaveAttribute('aria-multiselectable');

    rerender(<HeadlessMap data={testData} selectionMode="multiple" ariaLabel="Türkiye haritası" />);
    container = screen.getByTestId('headless-container');
    expect(container).toHaveAttribute('role', 'listbox');
    expect(container).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('uses button semantics without aria-selected in none mode', () => {
    const onClick = jest.fn();
    render(<HeadlessMap data={testData} onClick={onClick} />);

    const city = screen.getByTestId('city-alpha');
    expect(city).toHaveAttribute('role', 'button');
    expect(city).not.toHaveAttribute('aria-selected');

    fireEvent.click(city);
    expect(onClick).toHaveBeenCalledWith(alpha, expect.anything());
    expect(screen.getByTestId('selected')).toHaveTextContent('');
  });

  it('keeps selection actions inert in none mode', () => {
    render(<HeadlessMap data={testData} applyIds={['alpha']} />);

    fireEvent.click(screen.getByTestId('apply'));
    fireEvent.click(screen.getByTestId('activate'));
    fireEvent.click(screen.getByTestId('clear'));

    expect(screen.getByTestId('selected')).toHaveTextContent('');
  });

  it('handles pointer events and tolerates events without a city marker', () => {
    const restorePointerEvent = installPointerEvent();
    render(
      <HeadlessMap data={testData} showTooltip={true} tooltipDelay={0} />,
    );

    const city = screen.getByTestId('city-alpha');
    fireEvent.pointerEnter(city);
    fireEvent.pointerMove(city, { pageX: 1, pageY: 2, clientX: 1, clientY: 2 });
    fireEvent.pointerCancel(city);
    fireEvent.pointerLeave(city);

    fireEvent.mouseEnter(city);
    fireEvent.mouseMove(city, { pageX: 1, pageY: 2, clientX: 1, clientY: 2 });
    fireEvent.mouseLeave(city);

    city.removeAttribute('data-tm-city-id');
    fireEvent.pointerEnter(city);
    fireEvent.pointerMove(city, { pageX: 1, pageY: 2, clientX: 1, clientY: 2 });
    fireEvent.pointerCancel(city);
    fireEvent.pointerLeave(city);

    restorePointerEvent();

    const mouseCity = screen.getByTestId('city-beta');
    mouseCity.removeAttribute('data-tm-city-id');
    fireEvent.pointerEnter(mouseCity);
    fireEvent.pointerMove(mouseCity, { pageX: 1, pageY: 2, clientX: 1, clientY: 2 });
    fireEvent.pointerCancel(mouseCity);
    fireEvent.pointerLeave(mouseCity);
    fireEvent.mouseEnter(mouseCity);
    fireEvent.mouseMove(mouseCity, { pageX: 1, pageY: 2, clientX: 1, clientY: 2 });
    fireEvent.mouseLeave(mouseCity);
    fireEvent.mouseOver(mouseCity);
    fireEvent.click(mouseCity);
    fireEvent.keyDown(mouseCity, { key: 'Enter' });
    fireEvent.focus(mouseCity);
    fireEvent.blur(mouseCity);
  });

  it('supports controlled and uncontrolled single selection', () => {
    const onSelectionChange = jest.fn();
    const { rerender } = render(
      <HeadlessMap
        data={testData}
        selectionMode="single"
        selectedCity="alpha"
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(screen.getByTestId('selected')).toHaveTextContent('alpha');
    fireEvent.click(screen.getByTestId('city-beta'));
    expect(screen.getByTestId('selected')).toHaveTextContent('alpha');
    expect(onSelectionChange).toHaveBeenLastCalledWith([beta]);

    rerender(
      <HeadlessMap
        data={testData}
        selectionMode="single"
        selectedCity="beta"
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(screen.getByTestId('selected')).toHaveTextContent('beta');

    rerender(
      <HeadlessMap
        data={testData}
        selectionMode="single"
        selectedCity={null}
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(screen.getByTestId('selected')).toHaveTextContent('');

    rerender(<HeadlessMap data={testData} selectionMode="single" onSelectionChange={onSelectionChange} />);
    fireEvent.click(screen.getByTestId('city-alpha'));
    fireEvent.click(screen.getByTestId('city-beta'));
    expect(screen.getByTestId('selected')).toHaveTextContent('beta');
    expect(onSelectionChange).toHaveBeenLastCalledWith([beta]);
  });

  it('toggles multiple selection, respects the cap, and reports selection changes', () => {
    const onSelect = jest.fn();
    const onSelectionChange = jest.fn();
    const onMaxSelectionReached = jest.fn();
    render(
      <HeadlessMap
        data={threeData}
        selectionMode="multiple"
        maxSelection={2}
        onSelect={onSelect}
        onSelectionChange={onSelectionChange}
        onMaxSelectionReached={onMaxSelectionReached}
      />,
    );

    fireEvent.click(screen.getByTestId('city-alpha'));
    fireEvent.click(screen.getByTestId('city-beta'));
    fireEvent.click(screen.getByTestId('city-gamma'));

    expect(screen.getByTestId('selected')).toHaveTextContent('alpha,beta');
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
    expect(onMaxSelectionReached).toHaveBeenCalledWith(gamma, [alpha, beta], 2);

    fireEvent.click(screen.getByTestId('city-alpha'));
    expect(screen.getByTestId('selected')).toHaveTextContent('beta');
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelectionChange).toHaveBeenLastCalledWith([beta]);
  });

  it('applies changeSelection and clearSelection with the component fallback rules', () => {
    const onSelectionChange = jest.fn();
    const { rerender } = render(
      <HeadlessMap
        data={threeData}
        selectionMode="multiple"
        maxSelection={2}
        applyIds={['alpha', 'gamma', 'missing']}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.click(screen.getByTestId('apply'));
    expect(screen.getByTestId('selected')).toHaveTextContent('alpha,gamma');
    expect(onSelectionChange).toHaveBeenLastCalledWith([alpha, gamma]);

    fireEvent.click(screen.getByTestId('clear'));
    expect(screen.getByTestId('selected')).toHaveTextContent('');
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    rerender(
      <HeadlessMap
        data={testData}
        selectionMode="multiple"
        selectedCities={['alpha', 'missing']}
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(screen.getByTestId('selected')).toHaveTextContent('alpha');
  });

  it('reports disabled cities through aria-disabled and suppresses their callbacks', () => {
    const onClick = jest.fn();
    const onHover = jest.fn();
    render(
      <HeadlessMap
        data={testData}
        selectionMode="multiple"
        disabledCities={['alpha']}
        onClick={onClick}
        onHover={onHover}
      />,
    );

    const city = screen.getByTestId('city-alpha');
    expect(city).toHaveAttribute('aria-disabled', 'true');
    expect(city).toHaveAttribute('aria-label', 'Alpha, plate 1');
    expect(screen.getByTestId('disabled')).toHaveTextContent('alpha');
    expect(city).not.toHaveAttribute('onClick');

    fireEvent.click(city);
    fireEvent.mouseOver(city);
    expect(onClick).not.toHaveBeenCalled();
    expect(onHover).not.toHaveBeenCalled();
  });

  it('provides roving keyboard navigation, activation, announcements, and repair', () => {
    const onSelectionChange = jest.fn();
    const { rerender } = render(
      <HeadlessMap
        data={threeData}
        selectionMode="multiple"
        disabledCities={['beta']}
        onSelectionChange={onSelectionChange}
      />,
    );

    const getCity = (id: string): HTMLElement => screen.getByTestId(`city-${id}`);
    expect(getCity('alpha')).toHaveAttribute('tabindex', '0');

    fireEvent.focus(getCity('alpha'));
    expect(screen.getByTestId('live')).toHaveTextContent('Alpha, plate 1');

    fireEvent.keyDown(getCity('alpha'), { key: 'ArrowRight' });
    expect(getCity('beta')).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(getCity('beta'));
    expect(screen.getByTestId('live')).toHaveTextContent('Beta, plate 2, disabled');

    fireEvent.keyDown(getCity('beta'), { key: 'Enter' });
    expect(screen.getByTestId('selected')).toHaveTextContent('');

    fireEvent.keyDown(getCity('beta'), { key: 'ArrowRight' });
    expect(getCity('gamma')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(getCity('gamma'), { key: 'Home' });
    expect(getCity('alpha')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(getCity('alpha'), { key: 'End' });
    expect(getCity('gamma')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(getCity('gamma'), { key: 'ArrowRight' });
    expect(getCity('gamma')).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(getCity('gamma'), { key: 'ArrowUp' });
    expect(getCity('beta')).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(getCity('beta'), { key: 'ArrowLeft' });
    expect(getCity('alpha')).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(getCity('alpha'), { key: 'Enter' });
    expect(screen.getByTestId('selected')).toHaveTextContent('alpha');
    fireEvent.keyDown(getCity('alpha'), { key: ' ' });
    expect(screen.getByTestId('selected')).toHaveTextContent('');

    fireEvent.keyDown(getCity('alpha'), { key: 'Enter' });
    fireEvent.keyDown(getCity('alpha'), { key: 'Escape' });
    expect(screen.getByTestId('selected')).toHaveTextContent('');
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    const previousAnnouncement = screen.getByTestId('live').textContent;
    fireEvent.mouseOver(getCity('alpha'));
    expect(screen.getByTestId('live').textContent).toBe(previousAnnouncement);

    fireEvent.focus(getCity('gamma'));
    rerender(<HeadlessMap data={testData} selectionMode="multiple" />);
    expect(getCity('alpha')).toHaveAttribute('tabindex', '0');
  });

  it('renders city props on SVG elements without component markup', () => {
    render(<HeadlessSvgMap data={testData} />);

    const svg = screen.getByTestId('headless-svg');
    expect(svg).toHaveAttribute('role', 'listbox');
    expect(screen.getByTestId('svg-city-alpha')).toHaveAttribute('role', 'option');
    expect(screen.getByTestId('svg-city-alpha')).toHaveAttribute('aria-label', 'Alpha, plate 1');
    expect(screen.getByTestId('svg-city-alpha')).toHaveAttribute('tabindex', '0');
    expect(document.querySelector('#svg-turkiye-haritasi')).toBeNull();
  });

  it('preserves custom city metadata through state, getters, and callbacks', () => {
    type RegionCity = CityType & { region: string };
    const regionAlpha: RegionCity = { ...alpha, region: 'Marmara' };
    const regionBeta: RegionCity = { ...beta, region: 'Ege' };
    const regionData: Data<RegionCity> = { cities: [regionAlpha, regionBeta] };
    const onCity = jest.fn();

    const RegionMap = () => {
      const {
        getContainerProps,
        getCityProps,
        selectedCities,
        isCityDisabled,
      } = useTurkeyMap<RegionCity>({
        data: regionData,
        selectionMode: 'multiple',
        onSelect: (city) => onCity('select', city),
        onSelectionChange: (cities) => onCity('change', cities[0] ?? regionAlpha),
        onHover: (city) => onCity('hover', city),
        onClick: (city) => onCity('click', city),
        isCityDisabled: (city) => {
          onCity('disabled', city);
          return city.region === 'Yok';
        },
      });

      return (
        <div>
          <div data-testid="region-container" {...getContainerProps()}>
            {regionData.cities.map((city) => (
              <div key={city.id} data-testid={`region-${city.id}`} {...getCityProps(city)}>
                {city.region}
              </div>
            ))}
          </div>
          <div data-testid="region-selected">{selectedCities.map((city) => city.region).join(',')}</div>
          <button
            type="button"
            data-testid="region-disabled"
            onClick={() => isCityDisabled(regionAlpha)}
          >
            check
          </button>
        </div>
      );
    };

    render(<RegionMap />);
    expect(screen.getByTestId('region-alpha')).toHaveTextContent('Marmara');

    fireEvent.mouseOver(screen.getByTestId('region-alpha'));
    fireEvent.click(screen.getByTestId('region-alpha'));
    fireEvent.click(screen.getByTestId('region-disabled'));

    expect(screen.getByTestId('region-selected')).toHaveTextContent('Marmara');
    const calls = onCity.mock.calls.map(([, city]) => city as RegionCity);
    expect(calls.length).toBeGreaterThan(0);
    calls.forEach((city) => {
      expect(typeof city.region).toBe('string');
    });
    expect(onCity).toHaveBeenCalledWith('select', regionAlpha);
    expect(onCity).toHaveBeenCalledWith('change', regionAlpha);
    expect(onCity).toHaveBeenCalledWith('click', regionAlpha);
    expect(onCity).toHaveBeenCalledWith('hover', regionAlpha);
  });

  it('keeps the DOM payload fallback for wrapped city hover', () => {
    const onHover = jest.fn();
    const cityWrapper = (element: React.ReactElement) => element;
    render(
      <TurkeyMap data={testData} cityWrapper={cityWrapper} onHover={onHover} />,
    );

    fireEvent.mouseOver(getCityPath(getCityGroup(document.body, 'Alpha')));

    expect(onHover).toHaveBeenCalledWith({
      id: 'alpha',
      name: 'Alpha',
      plateNumber: 1,
      path: alpha.path,
    });
  });

  it('matches the component selection and ARIA behavior for the same interaction', () => {
    const onMapChange = jest.fn();
    const onHeadlessChange = jest.fn();
    render(
      <>
        <TurkeyMap data={testData} selectionMode="multiple" onSelectionChange={onMapChange} />
        <HeadlessMap data={testData} selectionMode="multiple" onSelectionChange={onHeadlessChange} />
      </>,
    );

    fireEvent.click(getCityPath(getCityGroup(document.body, 'Alpha')));
    fireEvent.click(screen.getByTestId('city-alpha'));

    expect(onMapChange).toHaveBeenLastCalledWith([alpha]);
    expect(onHeadlessChange).toHaveBeenLastCalledWith([alpha]);
    expect(screen.getByTestId('selected')).toHaveTextContent('alpha');

    const componentCity = getCityGroup(document.body, 'Alpha');
    const headlessCity = screen.getByTestId('city-alpha');
    expect(headlessCity).toHaveAttribute('role', componentCity.getAttribute('role') ?? '');
    expect(headlessCity).toHaveAttribute(
      'aria-label',
      componentCity.getAttribute('aria-label') ?? '',
    );
    expect(headlessCity).toHaveAttribute(
      'aria-selected',
      componentCity.getAttribute('aria-selected') ?? '',
    );
    expect(componentCity).toHaveAttribute('aria-selected', 'true');
  });
});
