import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import Tooltip from './Tooltip';
import { createColorResolver, getFiniteValue } from './color-scale';
import usePrefersReducedMotion from './usePrefersReducedMotion';
import {
  centerOnPoint,
  clampScale,
  clampViewport,
  getResetViewport,
  getViewBoxCenter,
  getWheelZoomScale,
  getViewportTransform,
  isSameViewport,
  normalizeZoomBounds,
  panBy,
  toViewBoxDelta,
  toViewBoxPoint,
  zoomAtPoint,
} from './viewport';
import type {
  ChoroplethValues,
  CityInteractionState,
  CityStyleGetter,
  CityType,
  CityWrapper,
  ColorScale,
  ColorScaleFunction,
  CustomStyleType,
  Data,
  GetColorCallback,
  IsCityDisabledCallback,
  OnMaxSelectionReachedCallback,
  OnSelectCallback,
  OnSelectionChangeCallback,
  OnViewportChangeCallback,
  RenderTooltipCallback,
  ScaleType,
  SelectionMode,
  TooltipPosition,
  TurkeyMapProps,
  TurkeyMapRef,
  ViewBoxType,
  Viewport,
} from './types';

export type {
  ChoroplethValues,
  CityInteractionState,
  CityStyleGetter,
  CityType,
  CityWrapper,
  ColorScale,
  ColorScaleFunction,
  CustomStyleType,
  Data,
  GetColorCallback,
  IsCityDisabledCallback,
  OnMaxSelectionReachedCallback,
  OnSelectCallback,
  OnSelectionChangeCallback,
  OnViewportChangeCallback,
  RenderTooltipCallback,
  ScaleType,
  SelectionMode,
  SelectionValue,
  TooltipPosition,
  TurkeyMapProps,
  TurkeyMapRef,
  ViewBoxType,
  Viewport,
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
const mouseDragThreshold = 4;
const touchDragThreshold = 8;
const doubleClickZoomFactor = 1.5;
const keyboardZoomFactor = 1.5;
const keyboardPanFraction = 0.1;

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
  choroplethActive: boolean;
  choroplethColor: string;
  animateValues: boolean;
  prefersReducedMotion: boolean;
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
  choroplethActive,
  choroplethColor,
  animateValues,
  prefersReducedMotion,
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
    const numericStrokeWidth = typeof resolvedStyle.strokeWidth === "number"
      ? resolvedStyle.strokeWidth
      : 1;
    let fill: string;
    let stroke: string;
    let strokeWidth: string | number;

    if (choroplethActive) {
      fill = isDisabled ? resolvedStyle.disabledColor : choroplethColor;

      if (isDisabled) {
        stroke = resolvedStyle.strokeColor;
        strokeWidth = resolvedStyle.strokeWidth;
      } else if (isSelected) {
        stroke = resolvedStyle.selectedStroke;
        strokeWidth = resolvedStyle.selectedStrokeWidth;
      } else if (hovered) {
        stroke = resolvedStyle.hoverColor;
        strokeWidth = Math.max(1, numericStrokeWidth);
      } else {
        stroke = resolvedStyle.strokeColor;
        strokeWidth = resolvedStyle.strokeWidth;
      }
    } else {
      fill = isDisabled
        ? resolvedStyle.disabledColor
        : isSelected
          ? resolvedStyle.selectedColor
          : hovered
            ? resolvedStyle.hoverColor
            : resolvedStyle.idleColor;
      stroke = isSelected ? resolvedStyle.selectedStroke : resolvedStyle.strokeColor;
      strokeWidth = isSelected
        ? resolvedStyle.selectedStrokeWidth
        : resolvedStyle.strokeWidth;
    }

    const basePathStyle: React.CSSProperties = {
      cursor: isDisabled ? "not-allowed" : "pointer",
      fill,
      stroke,
      strokeWidth,
    };

    if (choroplethActive && animateValues && !prefersReducedMotion) {
      basePathStyle.transition = "fill 300ms ease";
    }

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
  }, [
    city,
    hovered,
    focused,
    isSelected,
    isDisabled,
    resolvedStyle,
    getCityStyle,
    choroplethActive,
    choroplethColor,
    animateValues,
    prefersReducedMotion,
  ]);

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

const CoreTurkeyMap = forwardRef<TurkeyMapRef, CoreProps>(function CoreTurkeyMap({
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
  values,
  colorScale,
  scaleType,
  thresholds,
  noDataColor,
  getColor,
  animateValues = false,
  zoomable = false,
  minZoom,
  maxZoom,
  zoomControls = false,
  viewport,
  onViewportChange,
  ariaLabel = "Turkey map",
  a11yFallback = false,
}, ref) {
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

  const zoomBounds = useMemo(
    () => normalizeZoomBounds(minZoom, maxZoom),
    [minZoom, maxZoom],
  );
  const [internalViewport, setInternalViewport] = useState<Viewport>(() => (
    getResetViewport(zoomBounds, viewBox)
  ));
  const viewportControlled = viewport !== undefined;
  const effectiveViewport = useMemo(
    () => clampViewport(
      viewportControlled ? viewport : internalViewport,
      viewBox,
      zoomBounds,
    ),
    [viewportControlled, viewport, internalViewport, viewBox, zoomBounds],
  );
  const effectiveViewportRef = useRef(effectiveViewport);
  effectiveViewportRef.current = effectiveViewport;
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;
  const zoomBoundsRef = useRef(zoomBounds);
  zoomBoundsRef.current = zoomBounds;
  const viewportControlledRef = useRef(viewportControlled);
  viewportControlledRef.current = viewportControlled;
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;
  const zoomableRef = useRef(zoomable);
  zoomableRef.current = zoomable;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    pointerType: string;
    moved: boolean;
    pinchDistance?: number;
  } | undefined>(undefined);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const applyViewport = useCallback((next: Viewport): boolean => {
    const normalized = clampViewport(next, viewBoxRef.current, zoomBoundsRef.current);

    if (isSameViewport(effectiveViewportRef.current, normalized)) {
      return false;
    }

    effectiveViewportRef.current = normalized;

    if (!viewportControlledRef.current) {
      setInternalViewport(normalized);
    }

    if (onViewportChangeRef.current) {
      onViewportChangeRef.current(normalized);
    }

    return true;
  }, []);
  const resetViewport = useMemo(
    () => getResetViewport(zoomBounds, viewBox),
    [zoomBounds, viewBox],
  );

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

  const choroplethActive = values !== undefined;
  const resolvedNoDataColor = noDataColor ?? cssVar("tm-no-data-color", "#eeeeee");
  const colorResolver = useMemo(
    () => (choroplethActive
      ? createColorResolver({
        values,
        colorScale,
        scaleType,
        thresholds,
        getColor,
        noDataColor: resolvedNoDataColor,
      })
      : undefined),
    [
      choroplethActive,
      values,
      colorScale,
      scaleType,
      thresholds,
      getColor,
      resolvedNoDataColor,
    ],
  );

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

  useEffect(() => {
    if (!zoomable) {
      const hasZoomProps = viewport !== undefined
        || onViewportChange !== undefined
        || minZoom !== undefined
        || maxZoom !== undefined
        || zoomControls;

      if (hasZoomProps) {
        warnInDevelopment(
          "turkey-map-react: zoom props require zoomable={true}; they are ignored when zoomable is false or omitted.",
        );
      }
      return;
    }

    if (zoomBounds.minZoomInvalid) {
      warnInDevelopment(
        `turkey-map-react: minZoom must be a finite number greater than or equal to 1; received ${minZoom}. Using 1.`,
      );
    }

    if (zoomBounds.maxZoomInvalid) {
      warnInDevelopment(
        `turkey-map-react: maxZoom must be a finite number greater than or equal to 1; received ${maxZoom}. Using ${zoomBounds.maxZoom}.`,
      );
    }

    if (zoomBounds.maxZoomAdjusted) {
      warnInDevelopment(
        `turkey-map-react: maxZoom must be greater than or equal to minZoom; using ${zoomBounds.maxZoom}.`,
      );
    }
  }, [
    zoomable,
    viewport,
    onViewportChange,
    minZoom,
    maxZoom,
    zoomControls,
    zoomBounds.minZoomInvalid,
    zoomBounds.maxZoomInvalid,
    zoomBounds.maxZoomAdjusted,
    zoomBounds.maxZoom,
  ]);

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

  useImperativeHandle(ref, () => ({
    focusCity: (cityId: string, zoom?: number): void => {
      if (!zoomableRef.current) {
        return;
      }

      const group = provinceGroupRef.current;
      /* istanbul ignore if */
      if (!group) {
        return;
      }

      const city = latest.current.cityData.find((candidate) => candidate.id === cityId);
      if (!city) {
        warnInDevelopment(
          `turkey-map-react: focusCity could not find a city with id "${cityId}".`,
        );
        return;
      }

      let cityElement: SVGGElement | undefined;
      const elements = group.querySelectorAll('[data-tm-city-id]');
      for (let index = 0; index < elements.length; index += 1) {
        const candidate = elements[index];
        if (candidate.getAttribute('data-tm-city-id') === cityId) {
          cityElement = candidate as SVGGElement;
          break;
        }
      }

      if (!cityElement || typeof cityElement.getBBox !== 'function') {
        return;
      }

      let box: DOMRect;
      try {
        box = cityElement.getBBox();
      } catch {
        return;
      }

      if (
        !box
        || !Number.isFinite(box.x)
        || !Number.isFinite(box.y)
        || !Number.isFinite(box.width)
        || !Number.isFinite(box.height)
        || (box.width === 0 && box.height === 0)
      ) {
        warnInDevelopment(
          `turkey-map-react: focusCity could not measure "${cityId}"; the city may be hidden.`,
        );
        return;
      }

      const bounds = zoomBoundsRef.current;
      const current = effectiveViewportRef.current;
      const targetScale = clampScale(zoom ?? Math.max(current.scale, 2), bounds);

      applyViewport(centerOnPoint({
        scale: targetScale,
        translateX: current.translateX,
        translateY: current.translateY,
      }, {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
      }, viewBoxRef.current, bounds));
    },
    zoomTo: (scale: number): void => {
      if (!zoomableRef.current) {
        return;
      }

      const bounds = zoomBoundsRef.current;
      const box = viewBoxRef.current;
      applyViewport(zoomAtPoint(
        effectiveViewportRef.current,
        getViewBoxCenter(box),
        clampScale(scale, bounds),
        box,
        bounds,
      ));
    },
    resetView: (): void => {
      if (!zoomableRef.current) {
        return;
      }

      applyViewport(getResetViewport(zoomBoundsRef.current, viewBoxRef.current));
    },
  }), [applyViewport]);

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

  const scheduleClickSuppressionClear = useCallback((): void => {
    if (suppressClickTimerRef.current !== undefined) {
      clearTimeout(suppressClickTimerRef.current);
    }
    suppressClickTimerRef.current = setTimeout(() => {
      suppressClickTimerRef.current = undefined;
      suppressClickRef.current = false;
    }, 0);
  }, []);

  const suppressNextClick = useCallback((): void => {
    suppressClickRef.current = true;
    scheduleClickSuppressionClear();
  }, [scheduleClickSuppressionClear]);

  const zoomBy = useCallback((factor: number): void => {
    const box = viewBoxRef.current;
    const bounds = zoomBoundsRef.current;
    const current = effectiveViewportRef.current;
    applyViewport(zoomAtPoint(
      current,
      getViewBoxCenter(box),
      clampScale(current.scale * factor, bounds),
      box,
      bounds,
    ));
  }, [applyViewport]);

  const handleViewportPointerDown = useCallback((
    event: React.PointerEvent<SVGSVGElement>,
  ): void => {
    svgProps?.onPointerDown?.(event);
    if (event.defaultPrevented || !zoomableRef.current || event.button !== 0) {
      return;
    }

    suppressClickRef.current = false;
    if (suppressClickTimerRef.current !== undefined) {
      clearTimeout(suppressClickTimerRef.current);
      suppressClickTimerRef.current = undefined;
    }

    if (typeof event.currentTarget.setPointerCapture === 'function') {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is best-effort; some environments do not support it.
      }
    }

    const point = { x: event.clientX, y: event.clientY };
    const pointers = activePointersRef.current;
    pointers.set(event.pointerId, point);

    if (pointers.size === 1) {
      gestureRef.current = {
        startX: point.x,
        startY: point.y,
        lastX: point.x,
        lastY: point.y,
        pointerType: event.pointerType || 'mouse',
        moved: false,
      };
      return;
    }

    if (pointers.size === 2) {
      const [first, second] = Array.from(pointers.values());
      const gesture = gestureRef.current;
      if (gesture) {
        gesture.pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
        gesture.moved = true;
      }
    }
  }, [svgProps?.onPointerDown]);

  const handleViewportPointerMove = useCallback((
    event: React.PointerEvent<SVGSVGElement>,
  ): void => {
    svgProps?.onPointerMove?.(event);
    if (event.defaultPrevented || !zoomableRef.current) {
      return;
    }

    const pointers = activePointersRef.current;
    if (!pointers.has(event.pointerId)) {
      return;
    }

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const svg = svgRef.current;
    const gesture = gestureRef.current;
    /* istanbul ignore if */
    if (!svg || !gesture) {
      return;
    }

    const rect = svg.getBoundingClientRect();

    if (pointers.size >= 2) {
      const [first, second] = Array.from(pointers.values());
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const point = toViewBoxPoint(
        (first.x + second.x) / 2,
        (first.y + second.y) / 2,
        rect,
        viewBoxRef.current,
      );

      if (point && gesture.pinchDistance !== undefined && gesture.pinchDistance > 0 && distance > 0) {
        const current = effectiveViewportRef.current;
        const targetScale = clampScale(
          current.scale * (distance / gesture.pinchDistance),
          zoomBoundsRef.current,
        );
        applyViewport(zoomAtPoint(
          current,
          point,
          targetScale,
          viewBoxRef.current,
          zoomBoundsRef.current,
        ));
      }

      gesture.pinchDistance = distance;
      gesture.moved = true;
      return;
    }

    /* istanbul ignore if */
    if (pointers.size !== 1) {
      return;
    }

    const deltaX = event.clientX - gesture.lastX;
    const deltaY = event.clientY - gesture.lastY;
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;

    if (!gesture.moved) {
      const distanceFromStart = Math.hypot(
        event.clientX - gesture.startX,
        event.clientY - gesture.startY,
      );
      const threshold = gesture.pointerType === 'touch'
        ? touchDragThreshold
        : mouseDragThreshold;

      if (distanceFromStart > threshold) {
        gesture.moved = true;
      } else {
        return;
      }
    }

    const delta = toViewBoxDelta(deltaX, deltaY, rect, viewBoxRef.current);
    if (!delta) {
      return;
    }

    applyViewport(panBy(
      effectiveViewportRef.current,
      delta.x,
      delta.y,
      viewBoxRef.current,
      zoomBoundsRef.current,
    ));
  }, [svgProps?.onPointerMove, applyViewport]);

  const releaseViewportPointer = useCallback((
    event: React.PointerEvent<SVGSVGElement>,
    suppressClick: boolean,
  ): void => {
    if (typeof event.currentTarget.releasePointerCapture === 'function') {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture is best-effort; some environments do not support it.
      }
    }

    const pointers = activePointersRef.current;
    pointers.delete(event.pointerId);
    const gesture = gestureRef.current;

    if (suppressClick && gesture?.moved) {
      suppressNextClick();
    }

    if (pointers.size === 0) {
      gestureRef.current = undefined;
      return;
    }

    const [remaining] = Array.from(pointers.values());
    gestureRef.current = {
      startX: remaining.x,
      startY: remaining.y,
      lastX: remaining.x,
      lastY: remaining.y,
      pointerType: gesture?.pointerType ?? 'mouse',
      moved: true,
    };
  }, [suppressNextClick]);

  const handleViewportPointerUp = useCallback((
    event: React.PointerEvent<SVGSVGElement>,
  ): void => {
    svgProps?.onPointerUp?.(event);
    if (event.defaultPrevented || !zoomableRef.current) {
      return;
    }
    releaseViewportPointer(event, true);
  }, [svgProps?.onPointerUp, releaseViewportPointer]);

  const handleViewportPointerCancel = useCallback((
    event: React.PointerEvent<SVGSVGElement>,
  ): void => {
    svgProps?.onPointerCancel?.(event);
    if (event.defaultPrevented || !zoomableRef.current) {
      return;
    }
    releaseViewportPointer(event, false);
  }, [svgProps?.onPointerCancel, releaseViewportPointer]);

  const handleViewportDoubleClick = useCallback((
    event: React.MouseEvent<SVGSVGElement>,
  ): void => {
    svgProps?.onDoubleClick?.(event);
    if (event.defaultPrevented || !zoomableRef.current) {
      return;
    }

    const svg = svgRef.current;
    /* istanbul ignore if */
    if (!svg) {
      return;
    }

    const point = toViewBoxPoint(
      event.clientX,
      event.clientY,
      svg.getBoundingClientRect(),
      viewBoxRef.current,
    );
    if (!point) {
      return;
    }

    event.preventDefault();
    const box = viewBoxRef.current;
    const bounds = zoomBoundsRef.current;
    const current = effectiveViewportRef.current;
    applyViewport(zoomAtPoint(
      current,
      point,
      clampScale(current.scale * doubleClickZoomFactor, bounds),
      box,
      bounds,
    ));
  }, [svgProps?.onDoubleClick, applyViewport]);

  const handleViewportKeyDown = useCallback((
    event: React.KeyboardEvent<SVGSVGElement>,
  ): void => {
    svgProps?.onKeyDown?.(event);
    if (event.defaultPrevented || !zoomableRef.current) {
      return;
    }

    if (event.target !== event.currentTarget) {
      return;
    }

    const box = viewBoxRef.current;
    const bounds = zoomBoundsRef.current;
    const current = effectiveViewportRef.current;
    const halfWidth = box.width * keyboardPanFraction;
    const halfHeight = box.height * keyboardPanFraction;

    switch (event.key) {
      case '+':
      case '=':
        event.preventDefault();
        zoomBy(keyboardZoomFactor);
        return;
      case '-':
      case '_':
        event.preventDefault();
        zoomBy(1 / keyboardZoomFactor);
        return;
      case 'ArrowLeft':
        event.preventDefault();
        applyViewport(panBy(current, -halfWidth, 0, box, bounds));
        return;
      case 'ArrowRight':
        event.preventDefault();
        applyViewport(panBy(current, halfWidth, 0, box, bounds));
        return;
      case 'ArrowUp':
        event.preventDefault();
        applyViewport(panBy(current, 0, -halfHeight, box, bounds));
        return;
      case 'ArrowDown':
        event.preventDefault();
        applyViewport(panBy(current, 0, halfHeight, box, bounds));
        return;
      case '0':
        event.preventDefault();
        applyViewport(getResetViewport(bounds, box));
        return;
      default:
        return;
    }
  }, [svgProps?.onKeyDown, applyViewport, zoomBy]);

  useEffect(() => {
    if (!zoomable || typeof window === 'undefined') {
      return undefined;
    }

    const svg = svgRef.current;
    /* istanbul ignore if */
    if (!svg) {
      return undefined;
    }

    const handleWheel = (event: WheelEvent): void => {
      const point = toViewBoxPoint(
        event.clientX,
        event.clientY,
        svg.getBoundingClientRect(),
        viewBoxRef.current,
      );
      if (!point) {
        return;
      }

      event.preventDefault();
      const current = effectiveViewportRef.current;
      const targetScale = getWheelZoomScale(
        current.scale,
        event.deltaY,
        event.deltaMode,
        zoomBoundsRef.current,
      );
      applyViewport(zoomAtPoint(
        current,
        point,
        targetScale,
        viewBoxRef.current,
        zoomBoundsRef.current,
      ));
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      svg.removeEventListener('wheel', handleWheel);
    };
  }, [zoomable, applyViewport]);

  useEffect(() => {
    if (
      !zoomable
      || !tooltipVisibleRef.current
      || latest.current.tooltipPosition !== 'city'
    ) {
      return;
    }

    /* istanbul ignore if */
    if (tooltipCityId === undefined) {
      return;
    }

    const element = cityElementsRef.current.get(tooltipCityId);
    /* istanbul ignore if */
    if (!element) {
      return;
    }

    setTooltipStyle((previous) => ({
      ...previous,
      ...getTooltipCityStyle(element),
    }));
  }, [
    zoomable,
    effectiveViewport.scale,
    effectiveViewport.translateX,
    effectiveViewport.translateY,
    tooltipCityId,
    getTooltipCityStyle,
  ]);

  useEffect(() => () => {
    if (suppressClickTimerRef.current !== undefined) {
      clearTimeout(suppressClickTimerRef.current);
    }
  }, []);

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
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

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
        choroplethActive={choroplethActive}
        choroplethColor={colorResolver ? colorResolver(city) : ""}
        animateValues={animateValues}
        prefersReducedMotion={prefersReducedMotion}
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
    ? renderTooltip(tooltipCity, getFiniteValue(values, tooltipCity.id))
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
  const hasSvgAccessibleName = svgRest['aria-label'] !== undefined
    || svgRest['aria-labelledby'] !== undefined;
  const defaultViewportLabel = `${ariaLabel}, zoomable. Use + and - to zoom, arrow keys to pan, and 0 to reset.`;
  const zoomControlsDisabledReset = isSameViewport(effectiveViewport, resetViewport);
  const svgStyle: React.CSSProperties = {
    width: "100%",
    height: "auto",
    ...(zoomable
      ? { touchAction: "none" as const, userSelect: "none" as const }
      : undefined),
    ...svgPropsStyle,
  };

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
        ref={svgRef}
        version="1.1"
        id={resolvedIds.svg}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox={`${top} ${left} ${width} ${height}`}
        xmlSpace="preserve"
        className={svgPropsClassName}
        style={svgStyle}
        tabIndex={zoomable ? 0 : svgRest.tabIndex}
        aria-label={zoomable && !hasSvgAccessibleName
          ? defaultViewportLabel
          : svgRest['aria-label']}
        onKeyDown={zoomable ? handleViewportKeyDown : svgRest.onKeyDown}
        onDoubleClick={zoomable ? handleViewportDoubleClick : svgRest.onDoubleClick}
        onPointerDown={zoomable ? handleViewportPointerDown : svgRest.onPointerDown}
        onPointerMove={zoomable ? handleViewportPointerMove : svgRest.onPointerMove}
        onPointerUp={zoomable ? handleViewportPointerUp : svgRest.onPointerUp}
        onPointerCancel={zoomable ? handleViewportPointerCancel : svgRest.onPointerCancel}
      >
        <g
          key="turkiye"
          ref={provinceGroupRef}
          id={resolvedIds.provinceGroup}
          role={isSelectionEnabled ? "listbox" : "group"}
          aria-label={ariaLabel}
          aria-multiselectable={selectionMode === "multiple" ? true : undefined}
          transform={zoomable ? getViewportTransform(effectiveViewport) : undefined}
        >
          {provinceElements}
        </g>
      </svg>
      {zoomable && zoomControls && (
        <div
          className="tm-zoom-controls"
          role="group"
          aria-label="Map zoom controls"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginTop: 8,
          }}
        >
          <button
            type="button"
            className="tm-zoom-control"
            aria-label="Zoom in"
            disabled={effectiveViewport.scale >= zoomBounds.maxZoom}
            onClick={() => zoomBy(doubleClickZoomFactor)}
          >
            +
          </button>
          <button
            type="button"
            className="tm-zoom-control"
            aria-label="Zoom out"
            disabled={effectiveViewport.scale <= zoomBounds.minZoom}
            onClick={() => zoomBy(1 / doubleClickZoomFactor)}
          >
            &minus;
          </button>
          <button
            type="button"
            className="tm-zoom-control"
            aria-label="Reset view"
            disabled={zoomControlsDisabledReset}
            onClick={() => applyViewport(resetViewport)}
          >
            Reset
          </button>
        </div>
      )}
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
});

CoreTurkeyMap.displayName = 'CoreTurkeyMap';

export default CoreTurkeyMap;
