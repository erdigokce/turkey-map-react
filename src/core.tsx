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
import useTurkeyMap from './useTurkeyMap';
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
  UseTurkeyMapOptions,
  UseTurkeyMapPoint,
  ViewBoxType,
  Viewport,
} from './types';

export { default as useTurkeyMap } from './useTurkeyMap';

export type {
  Centroid,
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
  Region,
  RenderTooltipCallback,
  ScaleType,
  SelectionMode,
  SelectionValue,
  TooltipPosition,
  TurkeyMapProps,
  TurkeyMapRef,
  UseTurkeyMapCityProps,
  UseTurkeyMapContainerProps,
  UseTurkeyMapHandlers,
  UseTurkeyMapOptions,
  UseTurkeyMapPoint,
  UseTurkeyMapResult,
  UseTurkeyMapTooltipProps,
  ViewBoxType,
  Viewport,
} from './types';

export type CoreProps<TCity extends CityType = CityType> = Omit<TurkeyMapProps<TCity>, 'data'> & { data: Data<TCity> };

type CoreTurkeyMapComponent = {
  <TCity extends CityType = CityType>(
    props: CoreProps<TCity> & { ref?: React.Ref<TurkeyMapRef> },
  ): React.ReactElement;
  displayName?: string;
};

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
  event: React.MouseEvent<Element, MouseEvent>,
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

type ProvinceProps<TCity extends CityType = CityType> = {
  city: TCity;
  isSelected: boolean;
  isDisabled: boolean;
  hoverable: boolean;
  showTooltip: boolean;
  role: "option" | "button";
  ariaSelected?: boolean;
  ariaDisabled?: "true";
  tabIndex: 0 | -1;
  dataCityId: string;
  resolvedStyle: ResolvedStyle;
  focusStyle: React.CSSProperties;
  choroplethActive: boolean;
  choroplethColor: string;
  animateValues: boolean;
  prefersReducedMotion: boolean;
  getCityStyle?: CityStyleGetter<TCity>;
  cityWrapper?: CityWrapper<TCity>;
  onEnterCity: (city: TCity, element: Element, point: UseTurkeyMapPoint) => void;
  onLeaveCity: (city: TCity) => void;
  onHoverCity: (city: TCity, event: React.MouseEvent<Element, MouseEvent>) => void;
  onClickCity: (city: TCity, event: React.MouseEvent<Element, MouseEvent>) => void;
  onActivateCity: (city: TCity, event?: React.MouseEvent<Element, MouseEvent>) => void;
  onKeyDownCity: (city: TCity, event: React.KeyboardEvent<Element>) => void;
  onMoveCity: (city: TCity, element: Element, point: UseTurkeyMapPoint) => void;
  onFocusCity: (city: TCity, element: Element) => void;
  onBlurCity: (city: TCity) => void;
  registerHoverClear: (cityId: string, clearHover: () => void) => () => void;
} & {
  children?: React.ReactNode;
  [key: string]: unknown;
};

const ProvinceComponent = <TCity extends CityType = CityType>({
  city,
  isSelected,
  isDisabled,
  hoverable,
  showTooltip,
  role,
  ariaSelected,
  ariaDisabled,
  tabIndex,
  dataCityId,
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
  onActivateCity,
  onKeyDownCity,
  onMoveCity,
  onFocusCity,
  onBlurCity,
  registerHoverClear,
  children: wrapperChildren,
  ...wrapperProps
}: ProvinceProps<TCity>) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const focusFromPointerRef = useRef(false);
  const pointerEventsSupported = typeof window !== "undefined" && "PointerEvent" in window;

  const enterCity = useCallback((
    element: Element,
    point: UseTurkeyMapPoint,
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
    onMoveCity(city, event.currentTarget, toTooltipPoint(event));
  }, [city, onMoveCity]);

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
    onHoverCity(city, event);
  }, [city, onHoverCity]);

  const handleClick = useCallback((event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    const element = event.target as Element;
    if (element.tagName !== 'path') {
      return;
    }
    onClickCity(city, event);
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
    onKeyDownCity(city, event);
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
      data-tm-city-id={dataCityId}
      data-plakakodu={city.plateNumber}
      data-iladi={city.name}
      role={role}
      aria-label={getCityLabel(city)}
      aria-selected={ariaSelected}
      aria-disabled={ariaDisabled}
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
      tabIndex={tabIndex}
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
      {...(wrapperProps as React.SVGProps<SVGGElement>)}
    >
      {wrapperChildren !== undefined ? wrapperChildren : pathElement}
    </g>
  );

  return cityWrapper ? cityWrapper(cityElement, city) : cityElement;
};

const Province = React.memo(ProvinceComponent) as unknown as typeof ProvinceComponent;

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
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const resolvedIds = getResolvedIds(normalizeInstanceId(id));
  const animationName = getAnimationName(normalizeInstanceId(id));
  const cityData = data?.cities ?? [];

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
  const provinceGroupRef = useRef<SVGGElement | null>(null);
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

  const isSelectionEnabled = selectionMode !== "none";
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

  useEffect(() => {
    if (selectionMode === "none" && a11yFallback) {
      warnInDevelopment(
        "turkey-map-react: a11yFallback requires selectionMode=\"single\" or \"multiple\" and is ignored in \"none\" mode.",
      );
    }
  }, [selectionMode, a11yFallback]);

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

  useEffect(() => {
    if (tooltipPortal) {
      setMounted(true);
    }
  }, [tooltipPortal]);

  const handleHoverCallback = useCallback((
    city: CityType,
    event: React.MouseEvent<Element, MouseEvent>,
  ): void => {
    if (!onHover) {
      return;
    }
    onHover(cityWrapper ? { ...city, ...getCityPayloadFromEvent(event) } : city);
  }, [onHover, cityWrapper]);

  const handleClickCallback = useCallback((
    city: CityType,
    event?: React.MouseEvent<Element, MouseEvent>,
  ): void => {
    if (!onClick) {
      return;
    }
    onClick(cityWrapper && event ? { ...city, ...getCityPayloadFromEvent(event) } : city);
  }, [onClick, cityWrapper]);

  const hookOptions: UseTurkeyMapOptions = {
    data,
    visible,
    hoverable,
    showTooltip,
    tooltipPosition,
    tooltipPortal,
    tooltipOffset,
    tooltipDelay,
    tooltipAnimationName: animationName,
    tooltipRefreshKey: zoomable
      ? `${effectiveViewport.scale}:${effectiveViewport.translateX}:${effectiveViewport.translateY}`
      : undefined,
    disabledCities,
    isCityDisabled,
    onHover: handleHoverCallback,
    onClick: handleClickCallback,
    selectionMode,
    selectedCity,
    defaultSelectedCity,
    selectedCities,
    defaultSelectedCities,
    maxSelection,
    onSelect,
    onSelectionChange,
    onMaxSelectionReached,
    ariaLabel,
  };

  const {
    selectedIds,
    rovingCityId,
    tooltipCity,
    tooltipVisible,
    announcement,
    isCityDisabled: resolveCityDisabled,
    changeSelection,
    getContainerProps,
    getTooltipProps,
    cityHandlers,
    registerCityHoverClear,
  } = useTurkeyMap(hookOptions);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const handleClickCity = useCallback((
    city: CityType,
    event: React.MouseEvent<Element, MouseEvent>,
  ): void => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    cityHandlers.onClick(city, event);
  }, [cityHandlers]);

  const handleFallbackChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>): void => {
    const requestedIds = selectionMode === "multiple"
      ? Array.from(event.currentTarget.selectedOptions).map((option) => option.value)
      : event.currentTarget.value
        ? [event.currentTarget.value]
        : [];
    changeSelection(requestedIds);
  }, [selectionMode, changeSelection]);

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

      const city = cityData.find((candidate) => candidate.id === cityId);
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
  }), [applyViewport, cityData]);

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

  useEffect(() => () => {
    if (suppressClickTimerRef.current !== undefined) {
      clearTimeout(suppressClickTimerRef.current);
    }
  }, []);

  const provinceElements = cityData.map((city: CityType) => {
    const isDisabled = resolveCityDisabled(city);
    const isSelected = !isDisabled && selectedIdSet.has(city.id);
    return (
      <Province
        key={city.id}
        city={city}
        isSelected={isSelected}
        isDisabled={isDisabled}
        hoverable={hoverable}
        showTooltip={showTooltip}
        role={isSelectionEnabled ? "option" : "button"}
        ariaSelected={isSelectionEnabled ? selectedIdSet.has(city.id) : undefined}
        ariaDisabled={isDisabled ? "true" : undefined}
        tabIndex={city.id === rovingCityId ? 0 : -1}
        dataCityId={city.id}
        resolvedStyle={resolvedStyle}
        focusStyle={focusStyle}
        choroplethActive={choroplethActive}
        choroplethColor={colorResolver ? colorResolver(city) : ""}
        animateValues={animateValues}
        prefersReducedMotion={prefersReducedMotion}
        getCityStyle={getCityStyle}
        cityWrapper={cityWrapper}
        onEnterCity={cityHandlers.onEnter}
        onLeaveCity={cityHandlers.onLeave}
        onHoverCity={cityHandlers.onHover}
        onClickCity={handleClickCity}
        onActivateCity={cityHandlers.onActivate}
        onKeyDownCity={cityHandlers.onKeyDown}
        onMoveCity={cityHandlers.onMove}
        onFocusCity={cityHandlers.onFocus}
        onBlurCity={cityHandlers.onBlur}
        registerHoverClear={registerCityHoverClear}
      />
    );
  });

  const { top, left, width, height } = viewBox;
  const tooltipCityIsDisabled = tooltipCity !== undefined && resolveCityDisabled(tooltipCity);
  const tooltipContent = tooltipCityIsDisabled
    ? disabledTooltipText ?? tooltipText ?? tooltipCity?.name
    : tooltipText || tooltipCity?.name;
  const customTooltipContent = renderTooltip && tooltipCity
    ? renderTooltip(tooltipCity, getFiniteValue(values, tooltipCity.id))
    : undefined;
  const hasCustomTooltip = Boolean(renderTooltip) && tooltipCity !== undefined;
  const tooltipProps = getTooltipProps();
  const tooltipShellStyle: React.CSSProperties = {
    ...tooltipProps.style,
    ...(hasCustomTooltip
      ? { width: "auto", maxWidth: 320, whiteSpace: "normal" as const }
      : undefined),
  };
  const tooltipElement = showTooltip ? (
    <Tooltip
      id={resolvedIds.tooltip}
      text={hasCustomTooltip ? undefined : tooltipContent}
      style={tooltipShellStyle}
      visible={tooltipVisible}
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
  const {
    role: containerRole,
    "aria-label": containerAriaLabel,
    "aria-multiselectable": containerMultiselectable,
  } = getContainerProps();

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
          role={containerRole}
          aria-label={containerAriaLabel}
          aria-multiselectable={containerMultiselectable}
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
          value={selectionMode === "multiple" ? selectedIds : selectedIds[0] ?? ""}
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
}) as unknown as CoreTurkeyMapComponent;

CoreTurkeyMap.displayName = 'CoreTurkeyMap';

export default CoreTurkeyMap;
