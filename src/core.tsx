import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Tooltip from './Tooltip';
import usePrefersReducedMotion from './usePrefersReducedMotion';
import type {
  CityInteractionState,
  CityStyleGetter,
  CityType,
  CityWrapper,
  CustomStyleType,
  Data,
  IsCityDisabledCallback,
  OnMaxSelectionReachedCallback,
  OnSelectCallback,
  OnSelectionChangeCallback,
  RenderTooltipCallback,
  SelectionMode,
  TooltipPosition,
  TurkeyMapProps,
  ViewBoxType,
} from './types';

export type {
  CityInteractionState,
  CityStyleGetter,
  CityType,
  CityWrapper,
  CustomStyleType,
  Data,
  IsCityDisabledCallback,
  OnMaxSelectionReachedCallback,
  OnSelectCallback,
  OnSelectionChangeCallback,
  RenderTooltipCallback,
  SelectionMode,
  SelectionValue,
  TooltipPosition,
  TurkeyMapProps,
  ViewBoxType,
} from './types';

export type CoreProps = Omit<TurkeyMapProps, 'data'> & { data: Data };

type ResolvedStyle = {
  idleColor: string;
  hoverColor: string;
  selectedColor: string;
  selectedStroke: string;
  selectedStrokeWidth: number;
  disabledColor: string;
  strokeColor: string;
  strokeWidth: string | number;
  focusStroke: string;
  focusStrokeWidth: number;
};

type LatestValues = {
  onHover?: (city: CityType) => void;
  onClick?: (city: CityType) => void;
  cityWrapper?: CityWrapper;
  isCityDisabled?: IsCityDisabledCallback;
  activateCity: (city: CityType) => void;
  selectionMode: SelectionMode;
  showTooltip: boolean;
  animationName: string;
  tooltipPosition: TooltipPosition;
  tooltipPortal: boolean;
  tooltipOffset: number;
  tooltipDelay: number;
  prefersReducedMotion: boolean;
  selectedIdSet: Set<string>;
  disabledIdSet: Set<string>;
  clearSelection: () => void;
  cityData: CityType[];
};

type TooltipPoint = {
  pageX: number;
  pageY: number;
  clientX: number;
  clientY: number;
};

const toTooltipPoint = (event: {
  pageX: number;
  pageY: number;
  clientX: number;
  clientY: number;
}): TooltipPoint => ({
  pageX: event.pageX,
  pageY: event.pageY,
  clientX: event.clientX,
  clientY: event.clientY,
});

const defaultSelectedColor = "#dc3522";
const defaultDisabledColor = "#e5e5e5";
const defaultSelectedStroke = "#7a1a10";
const defaultSelectedStrokeWidth = 1.5;
const defaultFocusStroke = "#1a73e8";
const defaultFocusStrokeWidth = 2;
const legacyIds = {
  container: "svg-turkiye-haritasi-container",
  svg: "svg-turkiye-haritasi",
  tooltip: "svg-turkiye-haritasi-container-tooltip",
  provinceGroup: "turkiye",
};
const legacyAnimationName = "turkey_react_map_tooltip_fade_out";
const defaultTooltipOffset = 16;
const defaultTooltipDelay = 80;

const normalizeTooltipOffset = (value: number | undefined): number => (
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : defaultTooltipOffset
);

const normalizeTooltipDelay = (value: number | undefined): number => (
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : defaultTooltipDelay
);

const cssVar = (name: string, fallback: string | number): string => `var(--${name}, ${fallback})`;

const joinClassNames = (...values: Array<string | undefined>): string | undefined => {
  const className = values.filter((value): value is string => Boolean(value)).join(" ");
  return className || undefined;
};

const normalizeInstanceId = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const getResolvedIds = (instanceId: string | undefined) => {
  if (!instanceId) {
    return legacyIds;
  }

  return {
    container: instanceId,
    svg: `${instanceId}-svg`,
    tooltip: `${instanceId}-tooltip`,
    provinceGroup: `${instanceId}-turkiye`,
  };
};

const getAnimationName = (instanceId: string | undefined): string => (
  instanceId
    ? `tm-${instanceId.replace(/[^A-Za-z0-9_-]/g, "-")}-tooltip-fade-out`
    : legacyAnimationName
);

const mergeDefined = (
  base: React.CSSProperties,
  override: React.CSSProperties | undefined,
): React.CSSProperties => {
  const result: React.CSSProperties = { ...base };

  if (!override) {
    return result;
  }

  (Object.keys(override) as Array<keyof React.CSSProperties>).forEach((key) => {
    const value = override[key];
    if (value !== undefined) {
      (result as Record<string, unknown>)[key as string] = value;
    }
  });

  return result;
};

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

const getCityLabel = (city: CityType): string => `${city.name}, plate ${city.plateNumber}`;

const visuallyHiddenStyle: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const getCityPayloadFromEvent = (
  event: React.MouseEvent<SVGGElement, MouseEvent>,
): CityType => {
  const element = event.target as Element;
  const parent = element.parentNode as Element;
  const cityPath = element.getAttribute("d") ?? "";
  const cityPlateNumberText = parent.getAttribute('data-plakakodu') ?? "";
  const cityPlateNumber: number = parseInt(cityPlateNumberText !== "" ? cityPlateNumberText : "0");
  const cityName: string = parent.getAttribute('data-iladi') ?? "";
  return {
    id: parent.getAttribute('id') ?? "",
    name: cityName,
    plateNumber: cityPlateNumber,
    path: cityPath,
  };
};

type ProvinceProps = {
  city: CityType;
  isSelected: boolean;
  isAriaSelected: boolean;
  isDisabled: boolean;
  isRoving: boolean;
  isSelectionEnabled: boolean;
  hoverable: boolean;
  showTooltip: boolean;
  resolvedStyle: ResolvedStyle;
  focusStyle: React.CSSProperties;
  getCityStyle?: CityStyleGetter;
  cityWrapper?: CityWrapper;
  onEnterCity: (city: CityType, element: SVGGElement, point: TooltipPoint) => void;
  onLeaveCity: (city: CityType) => void;
  onHoverCity: (event: React.MouseEvent<SVGGElement, MouseEvent>, city: CityType) => void;
  onClickCity: (event: React.MouseEvent<SVGGElement, MouseEvent>, city: CityType) => void;
  onKeyDownCity: (event: React.KeyboardEvent<SVGGElement>, city: CityType) => void;
  onMoveCity: (element: SVGGElement, point: TooltipPoint) => void;
  onFocusCity: (city: CityType, element: SVGGElement) => void;
  onBlurCity: (city: CityType) => void;
  registerHoverClear: (cityId: string, clearHover: () => void) => () => void;
};

const ProvinceComponent = ({
  city,
  isSelected,
  isAriaSelected,
  isDisabled,
  isRoving,
  isSelectionEnabled,
  hoverable,
  showTooltip,
  resolvedStyle,
  focusStyle,
  getCityStyle,
  cityWrapper,
  onEnterCity,
  onLeaveCity,
  onHoverCity,
  onClickCity,
  onKeyDownCity,
  onMoveCity,
  onFocusCity,
  onBlurCity,
  registerHoverClear,
}: ProvinceProps) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const focusFromPointerRef = useRef(false);
  const pointerEventsSupported = typeof window !== "undefined" && "PointerEvent" in window;

  const enterCity = useCallback((
    element: SVGGElement,
    point: TooltipPoint,
  ): void => {
    setHovered(true);
    onEnterCity(city, element, point);
  }, [city, onEnterCity]);

  const leaveCity = useCallback((): void => {
    setHovered(false);
    onLeaveCity(city);
  }, [city, onLeaveCity]);

  const handlePointerEnter = useCallback((event: React.PointerEvent<SVGGElement>): void => {
    if (!pointerEventsSupported) {
      return;
    }
    enterCity(event.currentTarget, toTooltipPoint(event));
  }, [pointerEventsSupported, enterCity]);

  const handlePointerLeave = useCallback((): void => {
    if (!pointerEventsSupported) {
      return;
    }
    leaveCity();
  }, [pointerEventsSupported, leaveCity]);

  const handlePointerCancel = useCallback((): void => {
    if (!pointerEventsSupported) {
      return;
    }
    leaveCity();
  }, [pointerEventsSupported, leaveCity]);

  const handleMouseEnter = useCallback((event: React.MouseEvent<SVGGElement>): void => {
    if (pointerEventsSupported) {
      return;
    }
    enterCity(event.currentTarget, toTooltipPoint(event));
  }, [pointerEventsSupported, enterCity]);

  const handleMouseLeave = useCallback((): void => {
    if (pointerEventsSupported) {
      return;
    }
    leaveCity();
  }, [pointerEventsSupported, leaveCity]);

  const handleMove = useCallback((
    event: React.MouseEvent<SVGGElement> | React.PointerEvent<SVGGElement>,
  ): void => {
    onMoveCity(event.currentTarget, toTooltipPoint(event));
  }, [onMoveCity]);

  const handlePointerMove = useCallback((event: React.PointerEvent<SVGGElement>): void => {
    if (!pointerEventsSupported) {
      return;
    }
    handleMove(event);
  }, [pointerEventsSupported, handleMove]);

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGGElement>): void => {
    if (pointerEventsSupported) {
      return;
    }
    handleMove(event);
  }, [pointerEventsSupported, handleMove]);

  const handleMouseOver = useCallback((event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    const element = event.target as Element;
    if (element.tagName !== 'path') {
      return;
    }
    onHoverCity(event, city);
  }, [city, onHoverCity]);

  const handleClick = useCallback((event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    const element = event.target as Element;
    if (element.tagName !== 'path') {
      return;
    }
    onClickCity(event, city);
  }, [city, onClickCity]);

  const handleFocus = useCallback((event: React.FocusEvent<SVGGElement>): void => {
    setFocused(true);
    if (focusFromPointerRef.current) {
      focusFromPointerRef.current = false;
      setFocusVisible(false);
    } else {
      setFocusVisible(true);
    }
    onFocusCity(city, event.currentTarget);
  }, [city, onFocusCity]);

  const handleBlur = useCallback((): void => {
    setFocused(false);
    setFocusVisible(false);
    onBlurCity(city);
  }, [city, onBlurCity]);

  const handlePointerDown = useCallback((): void => {
    focusFromPointerRef.current = true;
    setFocusVisible(false);
  }, []);

  const handlePointerUp = useCallback((): void => {
    focusFromPointerRef.current = false;
  }, []);

  const handleKeyDown = useCallback((
    event: React.KeyboardEvent<SVGGElement>,
  ): void => {
    onKeyDownCity(event, city);
  }, [city, onKeyDownCity]);

  useEffect(() => {
    const clearHover = (): void => {
      setHovered(false);
    };
    return registerHoverClear(city.id, clearHover);
  }, [city.id, registerHoverClear]);

  const pathStyle = useMemo(() => {
    const fill = isDisabled
      ? resolvedStyle.disabledColor
      : isSelected
        ? resolvedStyle.selectedColor
        : hovered
          ? resolvedStyle.hoverColor
          : resolvedStyle.idleColor;
    const basePathStyle: React.CSSProperties = {
      cursor: isDisabled ? "not-allowed" : "pointer",
      fill,
      stroke: isSelected ? resolvedStyle.selectedStroke : resolvedStyle.strokeColor,
      strokeWidth: isSelected
        ? resolvedStyle.selectedStrokeWidth
        : resolvedStyle.strokeWidth,
    };
    const interactionState: CityInteractionState = {
      hovered,
      selected: isSelected,
      disabled: isDisabled,
      focused,
    };
    const themedStyle = getCityStyle
      ? getCityStyle(city, interactionState)
      : undefined;
    return mergeDefined(basePathStyle, themedStyle);
  }, [city, hovered, focused, isSelected, isDisabled, resolvedStyle, getCityStyle]);

  const pathElement = <path style={pathStyle} d={city.path} />;
  const cityElement = (
    <g
      id={city.id}
      data-tm-city-id={city.id}
      data-plakakodu={city.plateNumber}
      data-iladi={city.name}
      role={isSelectionEnabled ? "option" : "button"}
      aria-label={getCityLabel(city)}
      aria-selected={isSelectionEnabled ? isAriaSelected : undefined}
      aria-disabled={isDisabled ? "true" : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onMouseOver={!isDisabled && hoverable ? handleMouseOver : undefined}
      onMouseMove={showTooltip ? handleMouseMove : undefined}
      onPointerMove={showTooltip ? handlePointerMove : undefined}
      onClick={isDisabled ? undefined : handleClick}
      tabIndex={isRoving ? 0 : -1}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={
        focused
          ? focusVisible
            ? focusStyle
            : { outline: "none" }
          : undefined
      }
    >
      {pathElement}
    </g>
  );

  return cityWrapper ? cityWrapper(cityElement, city) : cityElement;
};

const Province = React.memo(ProvinceComponent);

const CoreTurkeyMap: React.FC<CoreProps> = ({
  viewBox = { top: 0, left: 80, width: 1050, height: 585 },
  visible = true,
  hoverable = true,
  showTooltip = false,
  data,
  customStyle,
  tooltipText,
  renderTooltip,
  tooltipPosition = "cursor",
  tooltipPortal = false,
  tooltipOffset = defaultTooltipOffset,
  tooltipDelay = defaultTooltipDelay,
  disabledCities,
  isCityDisabled,
  disabledTooltipText,
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
  onMaxSelectionReached,
  className,
  style,
  id,
  containerProps,
  svgProps,
  getCityStyle,
  ariaLabel = "Turkey map",
  a11yFallback = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (selectionMode === "single") {
      return normalizeIds(defaultSelectedCity).slice(0, 1);
    }
    if (selectionMode === "multiple") {
      return normalizeIds(defaultSelectedCities);
    }
    return [];
  });
  const [tooltipCityId, setTooltipCityId] = useState<string | undefined>(undefined);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    left: 0,
    top: 0,
    visibility: "hidden",
  });
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const resolvedTooltipOffset = normalizeTooltipOffset(tooltipOffset);
  const resolvedTooltipDelay = normalizeTooltipDelay(tooltipDelay);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastAnchorRef = useRef<TooltipPoint | undefined>(undefined);
  const cityElementsRef = useRef(new Map<string, SVGGElement>());
  const provinceGroupRef = useRef<SVGGElement | null>(null);
  const focusedCityIdRef = useRef<string | undefined>(undefined);
  const [rovingCityId, setRovingCityId] = useState<string | undefined>(undefined);
  const [announcement, setAnnouncement] = useState("");
  const tooltipVisibleRef = useRef(tooltipVisible);
  const tooltipStyleRef = useRef(tooltipStyle);
  tooltipVisibleRef.current = tooltipVisible;
  tooltipStyleRef.current = tooltipStyle;

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

  const cityData = data?.cities ?? [];

  const cityById = useMemo(() => {
    const map = new Map<string, CityType>();
    cityData.forEach((city) => {
      map.set(city.id, city);
    });
    return map;
  }, [cityData]);

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

  const disabledIdSet = useMemo(() => new Set(disabledCities ?? []), [disabledCities]);

  const resolvedIds = getResolvedIds(normalizeInstanceId(id));
  const animationName = getAnimationName(normalizeInstanceId(id));
  const resolvedStyle: ResolvedStyle = useMemo(() => ({
    idleColor: customStyle?.idleColor ?? cssVar("tm-idle-color", "#444"),
    hoverColor: customStyle?.hoverColor ?? cssVar("tm-hover-color", "#dc3522"),
    selectedColor: customStyle?.selectedColor ?? cssVar("tm-selected-color", defaultSelectedColor),
    selectedStroke: customStyle?.selectedStroke ?? defaultSelectedStroke,
    selectedStrokeWidth: customStyle?.selectedStrokeWidth ?? defaultSelectedStrokeWidth,
    disabledColor: customStyle?.disabledColor ?? cssVar("tm-disabled-color", defaultDisabledColor),
    strokeColor: customStyle?.strokeColor ?? cssVar("tm-stroke-color", "none"),
    strokeWidth: customStyle?.strokeWidth ?? cssVar("tm-stroke-width", 0.5),
    focusStroke: customStyle?.focusStroke ?? defaultFocusStroke,
    focusStrokeWidth: customStyle?.focusStrokeWidth ?? defaultFocusStrokeWidth,
  }), [
    customStyle?.idleColor,
    customStyle?.hoverColor,
    customStyle?.selectedColor,
    customStyle?.selectedStroke,
    customStyle?.selectedStrokeWidth,
    customStyle?.disabledColor,
    customStyle?.strokeColor,
    customStyle?.strokeWidth,
    customStyle?.focusStroke,
    customStyle?.focusStrokeWidth,
  ]);
  const focusStyle: React.CSSProperties = useMemo(() => ({
    outline: `${resolvedStyle.focusStrokeWidth}px solid ${resolvedStyle.focusStroke}`,
    outlineColor: cssVar("tm-focus-ring", resolvedStyle.focusStroke),
    outlineOffset: 2,
  }), [resolvedStyle.focusStroke, resolvedStyle.focusStrokeWidth]);

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

    if (selectionMode === "none" && a11yFallback) {
      warnInDevelopment(
        "turkey-map-react: a11yFallback requires selectionMode=\"single\" or \"multiple\" and is ignored in \"none\" mode.",
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
    a11yFallback,
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

  const commitSelection = useCallback((
    nextIds: string[],
    selectedCitiesToNotify: CityType[],
  ): boolean => {
    const currentIds = effectiveIds;
    const changed = nextIds.length !== currentIds.length
      || nextIds.some((id, index) => id !== currentIds[index]);

    selectedCitiesToNotify.forEach((city) => {
      if (onSelect) {
        onSelect(city);
      }
    });

    if (!changed) {
      return false;
    }

    if (!controlled) {
      setSelectedIds(nextIds);
    }

    if (onSelectionChange) {
      onSelectionChange(mapIdsToCities(nextIds));
    }

    return true;
  }, [
    effectiveIds,
    onSelect,
    controlled,
    onSelectionChange,
    mapIdsToCities,
  ]);

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

    const changed = commitSelection(nextIds, isSelectAction ? [city] : []);

    if (!changed) {
      return;
    }

    setAnnouncement(
      `${getCityLabel(city)}, ${isSelectAction ? "selected" : "not selected"}`,
    );
  }, [
    selectionMode,
    effectiveIds,
    effectiveMaxSelection,
    selectedCityObjects,
    onMaxSelectionReached,
    commitSelection,
  ]);

  const clearSelection = useCallback((): void => {
    if (effectiveIds.length === 0) {
      return;
    }

    if (!controlled) {
      setSelectedIds([]);
    }

    if (onSelectionChange) {
      onSelectionChange([]);
    }

    setAnnouncement("No province selected");
  }, [effectiveIds.length, controlled, onSelectionChange]);

  const latest = useRef<LatestValues>({
    onHover,
    onClick,
    cityWrapper,
    isCityDisabled,
    activateCity,
    selectionMode,
    showTooltip,
    animationName,
    tooltipPosition,
    tooltipPortal,
    tooltipOffset: resolvedTooltipOffset,
    tooltipDelay: resolvedTooltipDelay,
    prefersReducedMotion,
    selectedIdSet,
    disabledIdSet,
    clearSelection,
    cityData,
  });
  latest.current = {
    onHover,
    onClick,
    cityWrapper,
    isCityDisabled,
    activateCity,
    selectionMode,
    showTooltip,
    animationName,
    tooltipPosition,
    tooltipPortal,
    tooltipOffset: resolvedTooltipOffset,
    tooltipDelay: resolvedTooltipDelay,
    prefersReducedMotion,
    selectedIdSet,
    disabledIdSet,
    clearSelection,
    cityData,
  };

  const hoveredCityIdRef = useRef<string | undefined>(undefined);
  const hoverClearRef = useRef(new Map<string, () => void>());

  const resolveCityDisabled = (city: CityType): boolean => (
    disabledIdSet.has(city.id)
    || city.disabled === true
    || (latest.current.isCityDisabled ? latest.current.isCityDisabled(city) : false)
  );

  const resolvedRovingId = (() => {
    if (rovingCityId !== undefined && cityData.some((city) => city.id === rovingCityId)) {
      return rovingCityId;
    }

    const firstSelected = cityData.find((city) => selectedIdSet.has(city.id));
    if (firstSelected) {
      return firstSelected.id;
    }

    const firstEnabled = cityData.find((city) => !resolveCityDisabled(city));
    if (firstEnabled) {
      return firstEnabled.id;
    }

    return cityData[0]?.id;
  })();

  const focusCityAt = useCallback((index: number): void => {
    const cities = latest.current.cityData;
    /* istanbul ignore if */
    if (cities.length === 0) {
      return;
    }

    const clampedIndex = Math.min(Math.max(index, 0), cities.length - 1);
    const targetCity = cities[clampedIndex];
    setRovingCityId(targetCity.id);

    const group = provinceGroupRef.current;
    /* istanbul ignore if */
    if (!group) {
      return;
    }

    const elements = group.querySelectorAll('[data-tm-city-id]');
    for (let elementIndex = 0; elementIndex < elements.length; elementIndex += 1) {
      const element = elements[elementIndex];
      if (element.getAttribute('data-tm-city-id') === targetCity.id) {
        const focusableElement = element as SVGGElement;
        if (typeof focusableElement.focus === 'function') {
          focusableElement.focus();
        }
        return;
      }
    }
  }, []);

  const registerHoverClear = useCallback((cityId: string, clearHover: () => void): (() => void) => {
    hoverClearRef.current.set(cityId, clearHover);
    return () => {
      hoverClearRef.current.delete(cityId);
    };
  }, []);

  const getCityPayload = (
    event: React.MouseEvent<SVGGElement, MouseEvent>,
    city: CityType,
  ): CityType => {
    if (!latest.current.cityWrapper) {
      return {
        id: city.id,
        name: city.name,
        plateNumber: city.plateNumber,
        path: city.path,
      };
    }

    return getCityPayloadFromEvent(event);
  };

  const clearRevealTimer = useCallback((): void => {
    if (revealTimerRef.current !== undefined) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = undefined;
    }
  }, []);

  const clearHideTimer = useCallback((): void => {
    if (hideTimerRef.current !== undefined) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = undefined;
    }
  }, []);

  const getTooltipCursorStyle = useCallback((point: TooltipPoint): React.CSSProperties => {
    const { tooltipPortal: usePortal, tooltipOffset: offset } = latest.current;
    return {
      position: usePortal ? "fixed" : "absolute",
      left: (usePortal ? point.clientX : point.pageX) + offset,
      top: (usePortal ? point.clientY : point.pageY) - 2 * offset,
      transform: undefined,
    };
  }, []);

  const getTooltipCityStyle = useCallback((element: SVGGElement): React.CSSProperties => {
    const { tooltipPortal: usePortal, tooltipOffset: offset } = latest.current;
    const rect = element.getBoundingClientRect();
    const scrollX = !usePortal && typeof window !== "undefined" ? window.scrollX : 0;
    const scrollY = !usePortal && typeof window !== "undefined" ? window.scrollY : 0;

    return {
      position: usePortal ? "fixed" : "absolute",
      left: rect.left + rect.width / 2 + scrollX,
      top: rect.top + scrollY - offset,
      transform: "translate(-50%, -100%)",
    };
  }, []);

  const hideTooltip = useCallback((): void => {
    tooltipVisibleRef.current = false;
    setTooltipVisible(false);
    setTooltipStyle((prevState) => (
      latest.current.prefersReducedMotion
        ? { ...prevState, visibility: "hidden", animation: undefined }
        : {
          ...prevState,
          visibility: undefined,
          animation: `0.1s ${latest.current.animationName} forwards ease-out`,
        }
    ));
  }, []);

  const scheduleTooltipHide = useCallback((): void => {
    clearRevealTimer();
    clearHideTimer();
    if (latest.current.tooltipDelay === 0) {
      hideTooltip();
      return;
    }
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = undefined;
      hideTooltip();
    }, latest.current.tooltipDelay);
  }, [clearRevealTimer, clearHideTimer, hideTooltip]);

  const revealTooltip = useCallback((cityId: string, style: React.CSSProperties): void => {
    tooltipVisibleRef.current = true;
    setTooltipCityId(cityId);
    setTooltipVisible(true);
    setTooltipStyle((prevState) => ({
      ...prevState,
      ...style,
      animation: undefined,
      visibility: "visible",
    }));
  }, []);

  const handleTooltipEnter = useCallback((
    cityId: string,
    element: SVGGElement,
    point: TooltipPoint,
  ): void => {
    cityElementsRef.current.set(cityId, element);
    lastAnchorRef.current = point;
    if (!latest.current.showTooltip) {
      return;
    }

    clearHideTimer();
    clearRevealTimer();

    const style = latest.current.tooltipPosition === "city"
      ? getTooltipCityStyle(element)
      : getTooltipCursorStyle(point);
    const keepVisible = tooltipVisibleRef.current
      || Boolean(tooltipStyleRef.current.animation);

    setTooltipCityId(cityId);

    if (keepVisible) {
      revealTooltip(cityId, style);
      return;
    }

    setTooltipStyle((prevState) => ({ ...prevState, ...style }));
    if (latest.current.tooltipDelay === 0) {
      revealTooltip(cityId, style);
      return;
    }

    revealTimerRef.current = setTimeout(() => {
      revealTimerRef.current = undefined;
      const revealStyle = latest.current.tooltipPosition === "city"
        ? getTooltipCityStyle(element)
        : lastAnchorRef.current
          ? getTooltipCursorStyle(lastAnchorRef.current)
          : style;
      revealTooltip(cityId, revealStyle);
    }, latest.current.tooltipDelay);
  }, [clearHideTimer, clearRevealTimer, getTooltipCityStyle, getTooltipCursorStyle, revealTooltip]);

  const handleTooltipLeave = useCallback((): void => {
    if (!latest.current.showTooltip) {
      return;
    }

    clearRevealTimer();

    const focusedCityId = focusedCityIdRef.current;
    if (focusedCityId !== undefined) {
      const focusedElement = cityElementsRef.current.get(focusedCityId);
      if (focusedElement) {
        clearHideTimer();
        revealTooltip(focusedCityId, getTooltipCityStyle(focusedElement));
        return;
      }
    }

    scheduleTooltipHide();
  }, [clearHideTimer, clearRevealTimer, getTooltipCityStyle, revealTooltip, scheduleTooltipHide]);

  const handleTooltipMove = useCallback((
    element: SVGGElement,
    point: TooltipPoint,
  ): void => {
    lastAnchorRef.current = point;

    if (latest.current.tooltipPosition !== "cursor") {
      return;
    }

    const style = getTooltipCursorStyle(point);
    if (!tooltipVisibleRef.current) {
      setTooltipStyle((prevState) => ({ ...prevState, ...style }));
      return;
    }

    setTooltipStyle((prevState) => ({
      ...prevState,
      ...style,
      animation: undefined,
      visibility: "visible",
    }));
  }, [getTooltipCursorStyle]);

  const handleTooltipFocus = useCallback((
    cityId: string,
    element: SVGGElement,
  ): void => {
    focusedCityIdRef.current = cityId;
    cityElementsRef.current.set(cityId, element);
    if (!latest.current.showTooltip) {
      return;
    }

    clearRevealTimer();
    clearHideTimer();
    revealTooltip(cityId, getTooltipCityStyle(element));
  }, [clearHideTimer, clearRevealTimer, getTooltipCityStyle, revealTooltip]);

  const handleTooltipBlur = useCallback((cityId: string): void => {
    if (focusedCityIdRef.current === cityId) {
      focusedCityIdRef.current = undefined;
    }
    if (!latest.current.showTooltip) {
      return;
    }

    const hoveredCityId = hoveredCityIdRef.current;
    if (hoveredCityId !== undefined) {
      const hoveredElement = cityElementsRef.current.get(hoveredCityId);
      const anchor = lastAnchorRef.current ?? {
        pageX: 0,
        pageY: 0,
        clientX: 0,
        clientY: 0,
      };
      clearHideTimer();
      if (latest.current.tooltipPosition === "city" && hoveredElement) {
        revealTooltip(hoveredCityId, getTooltipCityStyle(hoveredElement));
      } else {
        revealTooltip(hoveredCityId, getTooltipCursorStyle(anchor));
      }
      return;
    }

    scheduleTooltipHide();
  }, [
    clearHideTimer,
    getTooltipCityStyle,
    getTooltipCursorStyle,
    revealTooltip,
    scheduleTooltipHide,
  ]);

  const handleCityEnter = useCallback((
    city: CityType,
    element: SVGGElement,
    point: TooltipPoint,
  ): void => {
    const previousCityId = hoveredCityIdRef.current;
    if (previousCityId !== undefined && previousCityId !== city.id) {
      hoverClearRef.current.get(previousCityId)?.();
    }
    hoveredCityIdRef.current = city.id;
    handleTooltipEnter(city.id, element, point);
  }, [handleTooltipEnter]);

  const handleCityLeave = useCallback((city: CityType): void => {
    if (hoveredCityIdRef.current === city.id) {
      hoveredCityIdRef.current = undefined;
    }
    handleTooltipLeave();
  }, [handleTooltipLeave]);

  const handleCityMove = useCallback((
    element: SVGGElement,
    point: TooltipPoint,
  ): void => {
    handleTooltipMove(element, point);
  }, [handleTooltipMove]);

  const handleCityFocus = useCallback((city: CityType, element: SVGGElement): void => {
    focusedCityIdRef.current = city.id;
    setRovingCityId(city.id);

    const isDisabled = latest.current.disabledIdSet.has(city.id)
      || city.disabled === true
      || (latest.current.isCityDisabled ? latest.current.isCityDisabled(city) : false);
    let message = getCityLabel(city);
    if (latest.current.selectedIdSet.has(city.id)) {
      message += ", selected";
    }
    if (isDisabled) {
      message += ", disabled";
    }
    setAnnouncement(message);

    handleTooltipFocus(city.id, element);
  }, [handleTooltipFocus]);

  const handleCityBlur = useCallback((city: CityType): void => {
    handleTooltipBlur(city.id);
  }, [handleTooltipBlur]);

  useEffect(() => {
    if (tooltipPortal) {
      setMounted(true);
    }
  }, [tooltipPortal]);

  useEffect(() => {
    if (showTooltip && visible) {
      return;
    }

    clearRevealTimer();
    clearHideTimer();
    tooltipVisibleRef.current = false;
    setTooltipVisible(false);
    setTooltipStyle((prevState) => (
      prevState.visibility === "hidden" && prevState.animation === undefined
        ? prevState
        : {
          ...prevState,
          visibility: "hidden",
          animation: undefined,
        }
    ));
  }, [showTooltip, visible, clearRevealTimer, clearHideTimer]);

  useEffect(() => () => {
    clearRevealTimer();
    clearHideTimer();
  }, [clearRevealTimer, clearHideTimer]);

  const handleCityHover = useCallback((
    event: React.MouseEvent<SVGGElement, MouseEvent>,
    city: CityType,
  ): void => {
    const hoverCallback = latest.current.onHover;
    if (hoverCallback) {
      hoverCallback(getCityPayload(event, city));
    }
  }, []);

  const handleCityClick = useCallback((
    event: React.MouseEvent<SVGGElement, MouseEvent>,
    city: CityType,
  ): void => {
    const clickCallback = latest.current.onClick;
    if (clickCallback) {
      clickCallback(getCityPayload(event, city));
    }

    setRovingCityId(city.id);

    if (latest.current.selectionMode !== "none") {
      latest.current.activateCity(city);
    }
  }, []);

  const handleCityActivate = useCallback((city: CityType): void => {
    const isDisabled = latest.current.disabledIdSet.has(city.id)
      || city.disabled === true
      || (latest.current.isCityDisabled ? latest.current.isCityDisabled(city) : false);
    if (isDisabled) {
      return;
    }

    if (latest.current.selectionMode === "none") {
      const clickCallback = latest.current.onClick;
      if (clickCallback) {
        clickCallback({
          id: city.id,
          name: city.name,
          plateNumber: city.plateNumber,
          path: city.path,
        });
      }
      setAnnouncement(`${getCityLabel(city)}, activated`);
      return;
    }

    latest.current.activateCity(city);
  }, []);

  const handleCityKeyDown = useCallback((
    event: React.KeyboardEvent<SVGGElement>,
    city: CityType,
  ): void => {
    const target = event.target as Element;
    if (target !== event.currentTarget && target.tagName !== 'path') {
      return;
    }

    const index = latest.current.cityData.findIndex((candidate) => candidate.id === city.id);
    /* istanbul ignore if */
    if (index < 0) {
      return;
    }

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusCityAt(index + 1);
        return;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusCityAt(index - 1);
        return;
      case "Home":
        event.preventDefault();
        focusCityAt(0);
        return;
      case "End":
        event.preventDefault();
        focusCityAt(latest.current.cityData.length - 1);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        handleCityActivate(city);
        return;
      case "Escape":
        event.preventDefault();
        latest.current.clearSelection();
        return;
      default:
        return;
    }
  }, [focusCityAt, handleCityActivate]);

  const handleFallbackChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>): void => {
    const requestedIds = selectionMode === "multiple"
      ? Array.from(event.currentTarget.selectedOptions).map((option) => option.value)
      : normalizeIds(event.currentTarget.value || null);
    const currentIds = effectiveIds;
    let nextIds = normalizeIds(requestedIds);
    const rejectedCities: CityType[] = [];

    if (selectionMode === "single") {
      nextIds = nextIds.slice(0, 1);
    }

    if (
      selectionMode === "multiple"
      && effectiveMaxSelection !== undefined
      && nextIds.length > effectiveMaxSelection
    ) {
      const keptIds = currentIds.filter((id) => nextIds.includes(id));
      const addedIds = nextIds.filter((id) => !currentIds.includes(id));
      const remainingSlots = Math.max(0, effectiveMaxSelection - keptIds.length);
      const allowedAddedIds = addedIds.slice(0, remainingSlots);
      const rejectedIds = addedIds.slice(remainingSlots);

      nextIds = nextIds.filter(
        (id) => keptIds.includes(id) || allowedAddedIds.includes(id),
      );

      rejectedIds.forEach((id) => {
        const rejectedCity = cityById.get(id);
        if (rejectedCity) {
          rejectedCities.push(rejectedCity);
        }
      });
    }

    const addedCities = mapIdsToCities(
      nextIds.filter((id) => !currentIds.includes(id)),
    );
    const selectedAfterCap = mapIdsToCities(nextIds);

    rejectedCities.forEach((city) => {
      if (onMaxSelectionReached) {
        onMaxSelectionReached(city, selectedAfterCap, effectiveMaxSelection as number);
      } else {
        warnInDevelopment(
          `turkey-map-react: maximum selection of ${effectiveMaxSelection} cities reached; "${city.name}" was not added.`,
        );
      }
    });

    const changed = commitSelection(nextIds, addedCities);

    if (!changed) {
      return;
    }

    if (nextIds.length === 0) {
      setAnnouncement("No province selected");
      return;
    }

    const addedCity = addedCities[addedCities.length - 1];
    if (addedCity) {
      setAnnouncement(`${getCityLabel(addedCity)}, selected`);
      return;
    }

    const removedId = currentIds.find((id) => !nextIds.includes(id));
    const removedCity = removedId ? cityById.get(removedId) : undefined;
    setAnnouncement(
      removedCity ? `${getCityLabel(removedCity)}, not selected` : "Selection updated",
    );
  }, [
    selectionMode,
    effectiveIds,
    effectiveMaxSelection,
    cityById,
    mapIdsToCities,
    onMaxSelectionReached,
    commitSelection,
  ]);


  const provinceElements = cityData.map((city: CityType) => {
    const isDisabled = resolveCityDisabled(city);
    const isSelected = !isDisabled && selectedIdSet.has(city.id);
    return (
      <Province
        key={city.id}
        city={city}
        isSelected={isSelected}
        isAriaSelected={selectedIdSet.has(city.id)}
        isDisabled={isDisabled}
        isRoving={city.id === resolvedRovingId}
        isSelectionEnabled={isSelectionEnabled}
        hoverable={hoverable}
        showTooltip={showTooltip}
        resolvedStyle={resolvedStyle}
        focusStyle={focusStyle}
        getCityStyle={getCityStyle}
        cityWrapper={cityWrapper}
        onEnterCity={handleCityEnter}
        onLeaveCity={handleCityLeave}
        onHoverCity={handleCityHover}
        onClickCity={handleCityClick}
        onKeyDownCity={handleCityKeyDown}
        onMoveCity={handleCityMove}
        onFocusCity={handleCityFocus}
        onBlurCity={handleCityBlur}
        registerHoverClear={registerHoverClear}
      />
    );
  });

  const { top, left, width, height } = viewBox;
  const tooltipCity = tooltipCityId === undefined
    ? undefined
    : cityById.get(tooltipCityId);
  const tooltipCityIsDisabled = tooltipCity !== undefined && resolveCityDisabled(tooltipCity);
  const tooltipContent = tooltipCityIsDisabled
    ? disabledTooltipText ?? tooltipText ?? tooltipCity?.name
    : tooltipText || tooltipCity?.name;
  const customTooltipContent = renderTooltip && tooltipCity
    ? renderTooltip(tooltipCity, undefined)
    : undefined;
  const hasCustomTooltip = Boolean(renderTooltip) && tooltipCity !== undefined;
  const tooltipShellStyle: React.CSSProperties = {
    ...tooltipStyle,
    ...(hasCustomTooltip
      ? { width: "auto", maxWidth: 320, whiteSpace: "normal" as const }
      : undefined),
  };
  const tooltipElement = showTooltip ? (
    <Tooltip
      id={resolvedIds.tooltip}
      text={hasCustomTooltip ? undefined : tooltipContent}
      style={tooltipShellStyle}
      visible={tooltipVisible && visible}
    >
      {hasCustomTooltip ? customTooltipContent : undefined}
    </Tooltip>
  ) : null;
  const portalActive = tooltipPortal
    && mounted
    && showTooltip
    && visible
    && typeof document !== "undefined";
  const {
    children: _containerChildren,
    className: containerPropsClassName,
    style: containerPropsStyle,
    ...containerRest
  } = containerProps ?? {};
  const {
    className: svgPropsClassName,
    style: svgPropsStyle,
    ...svgRest
  } = svgProps ?? {};

  return (
    <div
      {...containerRest}
      id={resolvedIds.container}
      className={joinClassNames(containerPropsClassName, className)}
      style={{
        maxWidth: 1140,
        margin: "0 auto",
        textAlign: 'center',
        ...containerPropsStyle,
        ...style,
      }}
      hidden={!visible}
    >
      {portalActive && tooltipElement
        ? createPortal(tooltipElement, document.body)
        : tooltipElement}
      <svg
        {...svgRest}
        version="1.1"
        id={resolvedIds.svg}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox={`${top} ${left} ${width} ${height}`}
        xmlSpace="preserve"
        className={svgPropsClassName}
        style={{ width: "100%", height: "auto", ...svgPropsStyle }}
      >
        <g
          key="turkiye"
          ref={provinceGroupRef}
          id={resolvedIds.provinceGroup}
          role={isSelectionEnabled ? "listbox" : "group"}
          aria-label={ariaLabel}
          aria-multiselectable={selectionMode === "multiple" ? true : undefined}
        >
          {provinceElements}
        </g>
      </svg>
      <div role="status" aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
        {announcement}
      </div>
      {a11yFallback && isSelectionEnabled && (
        <select
          aria-label={ariaLabel}
          multiple={selectionMode === "multiple"}
          value={selectionMode === "multiple" ? effectiveIds : effectiveIds[0] ?? ""}
          onChange={handleFallbackChange}
          style={visuallyHiddenStyle}
        >
          {selectionMode === "single" && <option value="">No selection</option>}
          {cityData.map((city) => (
            <option key={city.id} value={city.id} disabled={resolveCityDisabled(city)}>
              {getCityLabel(city)}
            </option>
          ))}
        </select>
      )}
      {showTooltip && <style>
        {`@keyframes ${animationName} {
            0% {
              opacity: 1;
            }
            100% {
              visibility: hidden;
              opacity: 0;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            #${resolvedIds.tooltip} {
              animation: none !important;
            }
          }`}
      </style>}
    </div>
  );
};

export default CoreTurkeyMap;
