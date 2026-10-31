import React, { useState, useCallback, useEffect, useMemo, MouseEventHandler } from 'react';
import Tooltip from './Tooltip';
import type { Property } from 'csstype';
import { cities } from './data';

type Data = {
  cities: CityType[],
}

export type SelectionMode = "none" | "single" | "multiple";
export type SelectionValue = string | string[] | null;
export type OnSelectCallback = (city: CityType) => void;
export type OnSelectionChangeCallback = (cities: CityType[]) => void;
export type OnMaxSelectionReachedCallback = (
  city: CityType,
  selectedCities: CityType[],
  maxSelection: number,
) => void;

interface IProps {
  viewBox?: ViewBoxType,
  visible?: boolean,
  hoverable?: boolean,
  customStyle?: CustomStyleType,
  showTooltip?: boolean,
  tooltipText?: string,
  data?: Data,
  cityWrapper?: (cityComponent: React.ReactElement, city: CityType) => React.ReactElement,
  onHover?: (city: CityType) => void,
  onClick?: (city: CityType) => void,
  selectionMode?: SelectionMode,
  selectedCity?: string | null,
  defaultSelectedCity?: string,
  selectedCities?: string[],
  defaultSelectedCities?: string[],
  maxSelection?: number,
  onSelect?: OnSelectCallback,
  onSelectionChange?: OnSelectionChangeCallback,
  onMaxSelectionReached?: OnMaxSelectionReachedCallback,
}

export type CityType = { id: string; plateNumber: number; name: string; path: string };
export type CustomStyleType = {
  idleColor: string,
  hoverColor: string,
  selectedColor?: string,
  selectedStroke?: string,
  selectedStrokeWidth?: number,
};
export type ViewBoxType = { top: number; left: number; width: number; height: number };
type GetCitiesReturn = { element: React.ReactElement, cityType: CityType };

const defaultCustomStyle: CustomStyleType = {
  idleColor: "#444",
  hoverColor: "#dc3522",
};
const defaultSelectedColor = "#dc3522";
const defaultSelectedStroke = "#7a1a10";
const defaultSelectedStrokeWidth = 1.5;
const focusOutline = "2px solid #1a73e8";

const normalizeIds = (value: string | string[] | null | undefined): string[] => {
  const values = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const id of values) {
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }

  return ids;
};

const warnInDevelopment = (message: string): void => {
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    console.warn(message);
  }
};

const TurkeyMap: React.FC<IProps> = ({
  viewBox = { top: 0, left: 80, width: 1050, height: 585 },
  visible = true,
  hoverable = true,
  showTooltip = false,
  data = { cities },
  customStyle = defaultCustomStyle,
  tooltipText,
  cityWrapper,
  onHover,
  onClick,
  selectionMode = "none",
  selectedCity,
  defaultSelectedCity,
  selectedCities,
  defaultSelectedCities,
  maxSelection,
  onSelect,
  onSelectionChange,
  onMaxSelectionReached
}) => {
  const [hoveredCityId, setHoveredCityId] = useState<string | undefined>(undefined);
  const [focusedCityId, setFocusedCityId] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (selectionMode === "single") {
      return normalizeIds(defaultSelectedCity).slice(0, 1);
    }
    if (selectionMode === "multiple") {
      return normalizeIds(defaultSelectedCities);
    }
    return [];
  });
  const [tooltipStyle, setTooltipStyle] = useState<{
    left: number,
    top: number,
    visibility?: Property.Visibility,
    animation?: Property.Animation
  }>({ left: 0, top: 0, visibility: "hidden" });

  const singleControlled = selectedCity !== undefined;
  const multipleControlled = selectedCities !== undefined;
  const controlled = selectionMode === "single"
    ? singleControlled
    : selectionMode === "multiple"
      ? multipleControlled
      : false;
  const isSelectionEnabled = selectionMode !== "none";

  const effectiveIds = useMemo(() => {
    if (selectionMode === "single") {
      return singleControlled
        ? normalizeIds(selectedCity).slice(0, 1)
        : selectedIds.slice(0, 1);
    }
    if (selectionMode === "multiple") {
      return multipleControlled ? normalizeIds(selectedCities) : selectedIds;
    }
    return [];
  }, [selectionMode, singleControlled, selectedCity, multipleControlled, selectedCities, selectedIds]);

  const cityById = useMemo(() => {
    const map = new Map<string, CityType>();
    data.cities.forEach((city) => {
      map.set(city.id, city);
    });
    return map;
  }, [data]);

  const mapIdsToCities = useCallback((ids: string[]): CityType[] => {
    const result: CityType[] = [];
    ids.forEach((id) => {
      const city = cityById.get(id);
      if (city) {
        result.push(city);
      }
    });
    return result;
  }, [cityById]);

  const selectedCityObjects = useMemo(
    () => mapIdsToCities(effectiveIds),
    [effectiveIds, mapIdsToCities],
  );
  const selectedIdSet = useMemo(() => new Set(effectiveIds), [effectiveIds]);

  const resolvedStyle = {
    idleColor: customStyle.idleColor,
    hoverColor: customStyle.hoverColor,
    selectedColor: customStyle.selectedColor ?? defaultSelectedColor,
    selectedStroke: customStyle.selectedStroke ?? defaultSelectedStroke,
    selectedStrokeWidth: customStyle.selectedStrokeWidth ?? defaultSelectedStrokeWidth,
  };

  const hasValidMaxSelection = maxSelection !== undefined
    && Number.isInteger(maxSelection)
    && maxSelection >= 1;
  const effectiveMaxSelection = hasValidMaxSelection ? maxSelection : undefined;

  useEffect(() => {
    const hasSelectionProps = selectedCity !== undefined
      || defaultSelectedCity !== undefined
      || selectedCities !== undefined
      || defaultSelectedCities !== undefined
      || maxSelection !== undefined
      || onSelect !== undefined
      || onSelectionChange !== undefined
      || onMaxSelectionReached !== undefined;

    if (selectionMode === "none" && hasSelectionProps) {
      warnInDevelopment(
        "turkey-map-react: selection props require selectionMode=\"single\" or \"multiple\"; they are ignored in \"none\" mode.",
      );
    }

    if (selectionMode === "single" && (selectedCities !== undefined || defaultSelectedCities !== undefined)) {
      warnInDevelopment(
        "turkey-map-react: multiple selection props are ignored when selectionMode is \"single\".",
      );
    }

    if (selectionMode === "multiple" && (selectedCity !== undefined || defaultSelectedCity !== undefined)) {
      warnInDevelopment(
        "turkey-map-react: single selection props are ignored when selectionMode is \"multiple\".",
      );
    }

    if (selectedCity !== undefined && defaultSelectedCity !== undefined) {
      warnInDevelopment(
        "turkey-map-react: selectedCity is controlled and takes precedence over defaultSelectedCity; remove defaultSelectedCity.",
      );
    }

    if (selectedCities !== undefined && defaultSelectedCities !== undefined) {
      warnInDevelopment(
        "turkey-map-react: selectedCities is controlled and takes precedence over defaultSelectedCities; remove defaultSelectedCities.",
      );
    }

    if (maxSelection !== undefined && !hasValidMaxSelection) {
      warnInDevelopment(
        `turkey-map-react: maxSelection must be a positive integer; received ${maxSelection}. No limit is applied.`,
      );
    }
  }, [
    selectionMode,
    selectedCity,
    defaultSelectedCity,
    selectedCities,
    defaultSelectedCities,
    maxSelection,
    hasValidMaxSelection,
    onSelect,
    onSelectionChange,
    onMaxSelectionReached,
  ]);

  useEffect(() => {
    if (
      selectionMode === "multiple"
      && multipleControlled
      && hasValidMaxSelection
      && effectiveIds.length > (maxSelection as number)
    ) {
      warnInDevelopment(
        `turkey-map-react: the controlled selectedCities value contains ${effectiveIds.length} cities, `
        + `which exceeds maxSelection (${maxSelection}); controlled values are rendered as supplied.`,
      );
    }
  }, [selectionMode, multipleControlled, hasValidMaxSelection, maxSelection, effectiveIds.length]);

  const handleMouseEvent = useCallback((
    event: React.MouseEvent<SVGGElement, MouseEvent>,
    callback: (city: CityType) => void
  ) => {
    const element = event.target as Element;

    if (element.tagName === 'path') {
      const parent = element.parentNode as Element;

      const cityId = parent.getAttribute('id') ?? "";
      const cityPath = element.getAttribute("d") ?? "";
      const cityPlateNumberText = parent.getAttribute('data-plakakodu') ?? "";
      const cityPlateNumber: number = parseInt(cityPlateNumberText !== "" ? cityPlateNumberText : "0");
      const cityName: string = parent.getAttribute('data-iladi') ?? "";
      const city: CityType = { id: cityId, name: cityName, plateNumber: cityPlateNumber, path: cityPath };

      if (callback && typeof callback === 'function') {
        callback(city);
      }
    }
  }, []);

  const handleHover = useCallback((city: CityType) => {
    setHoveredCityId(city.id);
    if (onHover) {
      onHover(city);
    }
  }, [onHover]);

  const handleOnHover = useCallback((event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    handleMouseEvent(event, handleHover);
  }, [handleMouseEvent, handleHover]);

  const activateCity = useCallback((city: CityType) => {
    const currentIds = effectiveIds;
    let nextIds: string[];
    let isSelectAction = true;

    if (selectionMode === "single") {
      nextIds = [city.id];
    } else if (currentIds.includes(city.id)) {
      nextIds = currentIds.filter((id) => id !== city.id);
      isSelectAction = false;
    } else {
      if (effectiveMaxSelection !== undefined && currentIds.length >= effectiveMaxSelection) {
        if (onMaxSelectionReached) {
          onMaxSelectionReached(city, selectedCityObjects, effectiveMaxSelection);
        } else {
          warnInDevelopment(
            `turkey-map-react: maximum selection of ${effectiveMaxSelection} cities reached; "${city.name}" was not added.`,
          );
        }
        return;
      }
      nextIds = [...currentIds, city.id];
    }

    const changed = nextIds.length !== currentIds.length
      || nextIds.some((id, index) => id !== currentIds[index]);

    if (isSelectAction && onSelect) {
      onSelect(city);
    }

    if (!changed) {
      return;
    }

    if (!controlled) {
      setSelectedIds(nextIds);
    }

    if (onSelectionChange) {
      onSelectionChange(mapIdsToCities(nextIds));
    }
  }, [
    selectionMode,
    effectiveIds,
    effectiveMaxSelection,
    selectedCityObjects,
    onMaxSelectionReached,
    onSelect,
    controlled,
    onSelectionChange,
    mapIdsToCities,
  ]);

  const handleOnClick = useCallback((event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    const element = event.target as Element;
    if (element.tagName !== 'path') {
      return;
    }

    if (onClick) {
      handleMouseEvent(event, onClick);
    }

    if (selectionMode !== "none") {
      const parent = element.parentNode as Element;
      const cityId = parent.getAttribute('id') ?? "";
      const city = cityById.get(cityId);
      if (city) {
        activateCity(city);
      }
    }
  }, [onClick, handleMouseEvent, selectionMode, cityById, activateCity]);

  const handleOnKeyDown = useCallback((
    event: React.KeyboardEvent<SVGGElement>,
    city: CityType,
  ): void => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    activateCity(city);
  }, [activateCity]);

  const handleOnFocus = useCallback((cityId: string): void => {
    setFocusedCityId(cityId);
  }, []);

  const handleOnBlur = useCallback((cityId: string): void => {
    setFocusedCityId((current) => (current === cityId ? undefined : current));
  }, []);

  const handleOnMouseMove: MouseEventHandler = useCallback((event) => {
    setTooltipStyle(prevState => ({
      ...prevState,
      left: event.pageX + 16,
      top: event.pageY - 32
    }));
  }, []);

  const handleOnMouseEnter = useCallback((cityId: string): void => {
    setHoveredCityId(cityId);
    if (!showTooltip) return;

    setTooltipStyle(prevState => ({
      ...prevState,
      animation: undefined,
      visibility: "visible"
    }));
  }, [showTooltip]);

  const handleOnMouseLeave = useCallback((): void => {
    setHoveredCityId(undefined);
    if (!showTooltip) return;

    setTooltipStyle(prevState => ({
      ...prevState,
      visibility: undefined,
      animation: `0.1s turkey_react_map_tooltip_fade_out forwards ease-out`,
    }));
  }, [showTooltip]);

  const getCities = useCallback((): GetCitiesReturn[] => {
    const { cities: cityData } = data;
    return cityData.map((city: CityType) => {
      const isSelected = selectedIdSet.has(city.id);
      const isFocused = focusedCityId === city.id;
      const fill = isSelected
        ? resolvedStyle.selectedColor
        : hoveredCityId === city.id
          ? resolvedStyle.hoverColor
          : resolvedStyle.idleColor;
      const pathStyle: React.CSSProperties = { cursor: "pointer", fill };

      if (isSelected) {
        pathStyle.stroke = resolvedStyle.selectedStroke;
        pathStyle.strokeWidth = resolvedStyle.selectedStrokeWidth;
      }

      const element = (
        <g
          id={city.id}
          data-plakakodu={city.plateNumber}
          data-iladi={city.name}
          onMouseEnter={() => handleOnMouseEnter(city.id)}
          onMouseLeave={handleOnMouseLeave}
          onMouseOver={event => hoverable ? handleOnHover(event) : undefined}
          onMouseMove={showTooltip ? handleOnMouseMove : undefined}
          onClick={handleOnClick}
          tabIndex={isSelectionEnabled ? 0 : undefined}
          onKeyDown={isSelectionEnabled ? event => handleOnKeyDown(event, city) : undefined}
          onFocus={isSelectionEnabled ? () => handleOnFocus(city.id) : undefined}
          onBlur={isSelectionEnabled ? () => handleOnBlur(city.id) : undefined}
          style={isFocused ? { outline: focusOutline, outlineOffset: 2 } : undefined}
        >
          <path style={pathStyle} d={city.path} />
        </g>
      );
      return { element, cityType: city };
    });
  }, [
    data,
    selectedIdSet,
    focusedCityId,
    hoveredCityId,
    resolvedStyle,
    isSelectionEnabled,
    hoverable,
    showTooltip,
    handleOnMouseEnter,
    handleOnMouseLeave,
    handleOnHover,
    handleOnMouseMove,
    handleOnClick,
    handleOnKeyDown,
    handleOnFocus,
    handleOnBlur,
  ]);

  const renderCityWrapper = useCallback(() => {
    return getCities().map((param, index) => {
      const wrappedElement = cityWrapper ? cityWrapper(param.element, param.cityType) : param.element;
      return React.cloneElement(wrappedElement, { key: param.cityType.id });
    });
  }, [getCities, cityWrapper]);

  const { top, left, width, height } = viewBox;
  const hoveredCityName = hoveredCityId === undefined
    ? undefined
    : cityById.get(hoveredCityId)?.name;

  return (
    <div id="svg-turkiye-haritasi-container" style={{ maxWidth: 1140, margin: "0 auto", textAlign: 'center' }} hidden={!visible}>
      {showTooltip && <Tooltip text={tooltipText || hoveredCityName} style={tooltipStyle} />}
      <svg
        version="1.1"
        id="svg-turkiye-haritasi"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox={`${top} ${left} ${width} ${height}`}
        xmlSpace="preserve"
        style={{ width: "100%", height: "auto" }}
      >
        <g key="turkiye" id="turkiye">
          {renderCityWrapper()}
        </g>
      </svg>
      {showTooltip && <style>
        {`@keyframes turkey_react_map_tooltip_fade_out {
            0% {
              opacity: 1;
            }
            100% {
              visibility: hidden;
              opacity: 0;
            }
          }`}
      </style>}
    </div>
  );
};

export default TurkeyMap;
