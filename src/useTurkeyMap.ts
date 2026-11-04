import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion';
import type {
  CityType,
  IsCityDisabledCallback,
  OnMaxSelectionReachedCallback,
  OnSelectCallback,
  OnSelectionChangeCallback,
  SelectionMode,
  TooltipPosition,
  UseTurkeyMapCityProps,
  UseTurkeyMapContainerProps,
  UseTurkeyMapHandlers,
  UseTurkeyMapOptions,
  UseTurkeyMapPoint,
  UseTurkeyMapResult,
  UseTurkeyMapTooltipProps,
} from './types';

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

const supportsPointerEvents = (): boolean => (
  typeof window !== "undefined" && "PointerEvent" in window
);

const toTooltipPoint = (event: {
  pageX: number;
  pageY: number;
  clientX: number;
  clientY: number;
}): UseTurkeyMapPoint => ({
  pageX: event.pageX,
  pageY: event.pageY,
  clientX: event.clientX,
  clientY: event.clientY,
});

type LatestValues<TCity extends CityType> = {
  onHover?: (city: TCity, event: ReactMouseEvent<Element>) => void;
  onClick?: (city: TCity, event?: ReactMouseEvent<Element>) => void;
  isCityDisabled?: IsCityDisabledCallback<TCity>;
  activateCity: (city: TCity) => void;
  selectionMode: SelectionMode;
  hoverable: boolean;
  showTooltip: boolean;
  tooltipPosition: TooltipPosition;
  tooltipPortal: boolean;
  tooltipOffset: number;
  tooltipDelay: number;
  tooltipAnimationName: string | undefined;
  prefersReducedMotion: boolean;
  selectedIdSet: Set<string>;
  disabledIdSet: Set<string>;
  clearSelection: () => void;
  cityData: TCity[];
};

const useTurkeyMap = <TCity extends CityType = CityType>(
  options: UseTurkeyMapOptions<TCity>,
): UseTurkeyMapResult<TCity> => {
  const {
    data,
    visible = true,
    hoverable = true,
    showTooltip = false,
    tooltipPosition = "cursor",
    tooltipPortal = false,
    tooltipOffset = defaultTooltipOffset,
    tooltipDelay = defaultTooltipDelay,
    tooltipAnimationName,
    tooltipRefreshKey,
    disabledCities,
    isCityDisabled,
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
    ariaLabel = "Turkey map",
  } = options;

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
  const [rovingCityId, setRovingCityId] = useState<string | undefined>(undefined);
  const [focusedCityId, setFocusedCityId] = useState<string | undefined>(undefined);
  const [announcement, setAnnouncement] = useState("");
  const prefersReducedMotion = usePrefersReducedMotion();
  const resolvedTooltipOffset = normalizeTooltipOffset(tooltipOffset);
  const resolvedTooltipDelay = normalizeTooltipDelay(tooltipDelay);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastAnchorRef = useRef<UseTurkeyMapPoint | undefined>(undefined);
  const cityElementsRef = useRef(new Map<string, Element>());
  const focusedCityIdRef = useRef<string | undefined>(undefined);
  const hoveredCityIdRef = useRef<string | undefined>(undefined);
  const hoverClearRef = useRef(new Map<string, () => void>());
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
    const map = new Map<string, TCity>();
    cityData.forEach((city) => {
      map.set(city.id, city);
    });
    return map;
  }, [cityData]);
  const cityByIdRef = useRef(cityById);
  cityByIdRef.current = cityById;

  const mapIdsToCities = useCallback((ids: string[]): TCity[] => {
    const result: TCity[] = [];
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

  const commitSelection = useCallback((
    nextIds: string[],
    selectedCitiesToNotify: TCity[],
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

  const activateCity = useCallback((city: TCity): void => {
    if (selectionMode === "none") {
      return;
    }

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
    if (selectionMode === "none" || effectiveIds.length === 0) {
      return;
    }

    if (!controlled) {
      setSelectedIds([]);
    }

    if (onSelectionChange) {
      onSelectionChange([]);
    }

    setAnnouncement("No province selected");
  }, [selectionMode, effectiveIds.length, controlled, onSelectionChange]);

  const changeSelection = useCallback((requestedIds: string[]): void => {
    if (selectionMode === "none") {
      return;
    }

    const requested = normalizeIds(requestedIds);
    const currentIds = effectiveIds;
    let nextIds = requested;
    const rejectedCities: TCity[] = [];

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

  const latest = useRef<LatestValues<TCity>>({
    onHover,
    onClick,
    isCityDisabled,
    activateCity,
    selectionMode,
    hoverable,
    showTooltip,
    tooltipPosition,
    tooltipPortal,
    tooltipOffset: resolvedTooltipOffset,
    tooltipDelay: resolvedTooltipDelay,
    tooltipAnimationName,
    prefersReducedMotion,
    selectedIdSet,
    disabledIdSet,
    clearSelection,
    cityData,
  });
  latest.current = {
    onHover,
    onClick,
    isCityDisabled,
    activateCity,
    selectionMode,
    hoverable,
    showTooltip,
    tooltipPosition,
    tooltipPortal,
    tooltipOffset: resolvedTooltipOffset,
    tooltipDelay: resolvedTooltipDelay,
    tooltipAnimationName,
    prefersReducedMotion,
    selectedIdSet,
    disabledIdSet,
    clearSelection,
    cityData,
  };

  const isCityDisabledResolved = useCallback((city: TCity): boolean => (
    disabledIdSet.has(city.id)
    || city.disabled === true
    || (latest.current.isCityDisabled ? latest.current.isCityDisabled(city) : false)
  ), [disabledIdSet]);

  const resolvedRovingId = (() => {
    if (rovingCityId !== undefined && cityData.some((city) => city.id === rovingCityId)) {
      return rovingCityId;
    }

    const firstSelected = cityData.find((city) => selectedIdSet.has(city.id));
    if (firstSelected) {
      return firstSelected.id;
    }

    const firstEnabled = cityData.find((city) => !isCityDisabledResolved(city));
    if (firstEnabled) {
      return firstEnabled.id;
    }

    return cityData[0]?.id;
  })();

  const registerCityHoverClear = useCallback(
    (cityId: string, clearHover: () => void): (() => void) => {
      hoverClearRef.current.set(cityId, clearHover);
      return () => {
        hoverClearRef.current.delete(cityId);
      };
    },
    [],
  );

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

  const getTooltipCursorStyle = useCallback((point: UseTurkeyMapPoint): React.CSSProperties => {
    const { tooltipPortal: usePortal, tooltipOffset: offset } = latest.current;
    return {
      position: usePortal ? "fixed" : "absolute",
      left: (usePortal ? point.clientX : point.pageX) + offset,
      top: (usePortal ? point.clientY : point.pageY) - 2 * offset,
      transform: undefined,
    };
  }, []);

  const getTooltipCityStyle = useCallback((element: Element): React.CSSProperties => {
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
    setTooltipStyle((prevState) => {
      const animationName = latest.current.tooltipAnimationName;
      if (latest.current.prefersReducedMotion || !animationName) {
        return { ...prevState, visibility: "hidden", animation: undefined };
      }
      return {
        ...prevState,
        visibility: undefined,
        animation: `0.1s ${animationName} forwards ease-out`,
      };
    });
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
    element: Element,
    point: UseTurkeyMapPoint,
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
    element: Element,
    point: UseTurkeyMapPoint,
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
    element: Element,
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
    city: TCity,
    element: Element,
    point: UseTurkeyMapPoint,
  ): void => {
    const previousCityId = hoveredCityIdRef.current;
    if (previousCityId !== undefined && previousCityId !== city.id) {
      hoverClearRef.current.get(previousCityId)?.();
    }
    hoveredCityIdRef.current = city.id;
    handleTooltipEnter(city.id, element, point);
  }, [handleTooltipEnter]);

  const handleCityLeave = useCallback((city: TCity): void => {
    if (hoveredCityIdRef.current === city.id) {
      hoveredCityIdRef.current = undefined;
    }
    handleTooltipLeave();
  }, [handleTooltipLeave]);

  const handleCityMove = useCallback((
    element: Element,
    point: UseTurkeyMapPoint,
  ): void => {
    handleTooltipMove(element, point);
  }, [handleTooltipMove]);

  const handleCityFocus = useCallback((city: TCity, element: Element): void => {
    focusedCityIdRef.current = city.id;
    setFocusedCityId(city.id);
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

  const handleCityBlur = useCallback((city: TCity): void => {
    setFocusedCityId(undefined);
    handleTooltipBlur(city.id);
  }, [handleTooltipBlur]);

  useEffect(() => {
    if (
      !showTooltip
      || !tooltipVisibleRef.current
      || tooltipPosition !== "city"
      || tooltipCityId === undefined
    ) {
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
    tooltipRefreshKey,
    showTooltip,
    tooltipPosition,
    tooltipCityId,
    getTooltipCityStyle,
  ]);

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
    event: ReactMouseEvent<Element>,
    city: TCity,
  ): void => {
    const hoverCallback = latest.current.onHover;
    if (hoverCallback) {
      hoverCallback(city, event);
    }
  }, []);

  const handleCityClick = useCallback((
    event: ReactMouseEvent<Element>,
    city: TCity,
  ): void => {
    const clickCallback = latest.current.onClick;
    if (clickCallback) {
      clickCallback(city, event);
    }

    setRovingCityId(city.id);

    if (latest.current.selectionMode !== "none") {
      latest.current.activateCity(city);
    }
  }, []);

  const handleCityActivate = useCallback((city: TCity): void => {
    const isDisabled = latest.current.disabledIdSet.has(city.id)
      || city.disabled === true
      || (latest.current.isCityDisabled ? latest.current.isCityDisabled(city) : false);
    if (isDisabled) {
      return;
    }

    if (latest.current.selectionMode === "none") {
      const clickCallback = latest.current.onClick;
      if (clickCallback) {
        clickCallback(city);
      }
      setAnnouncement(`${getCityLabel(city)}, activated`);
      return;
    }

    latest.current.activateCity(city);
  }, []);

  const focusCityAt = useCallback((index: number, origin: Element): void => {
    const cities = latest.current.cityData;
    /* istanbul ignore if */
    if (cities.length === 0) {
      return;
    }

    const clampedIndex = Math.min(Math.max(index, 0), cities.length - 1);
    const targetCity = cities[clampedIndex];
    setRovingCityId(targetCity.id);

    const container = origin.closest("[data-tm-map-container]") ?? origin.parentElement;
    /* istanbul ignore if */
    if (!container) {
      return;
    }

    const elements = container.querySelectorAll("[data-tm-city-id]");
    for (let elementIndex = 0; elementIndex < elements.length; elementIndex += 1) {
      const element = elements[elementIndex];
      if (element.getAttribute("data-tm-city-id") === targetCity.id) {
        const focusableElement = element as Element & { focus?: () => void };
        if (typeof focusableElement.focus === "function") {
          focusableElement.focus();
        }
        return;
      }
    }
  }, []);

  const handleCityKeyDown = useCallback((
    event: ReactKeyboardEvent<Element>,
    city: TCity,
  ): void => {
    const target = event.target as Element;
    if (target !== event.currentTarget && target.tagName !== "path") {
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
        focusCityAt(index + 1, event.currentTarget);
        return;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusCityAt(index - 1, event.currentTarget);
        return;
      case "Home":
        event.preventDefault();
        focusCityAt(0, event.currentTarget);
        return;
      case "End":
        event.preventDefault();
        focusCityAt(latest.current.cityData.length - 1, event.currentTarget);
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

  const getCityFromEvent = useCallback((event: { currentTarget: EventTarget | null }): TCity | undefined => {
    const element = event.currentTarget as Element;
    const cityId = element.getAttribute("data-tm-city-id");
    return cityId ? cityByIdRef.current.get(cityId) : undefined;
  }, []);

  const handlePointerEnter = useCallback((event: ReactPointerEvent<Element>): void => {
    if (!supportsPointerEvents()) {
      return;
    }
    const city = getCityFromEvent(event);
    if (!city) {
      return;
    }
    handleCityEnter(city, event.currentTarget, toTooltipPoint(event));
  }, [getCityFromEvent, handleCityEnter]);

  const handlePointerLeave = useCallback((event: ReactPointerEvent<Element>): void => {
    if (!supportsPointerEvents()) {
      return;
    }
    const city = getCityFromEvent(event);
    if (!city) {
      return;
    }
    handleCityLeave(city);
  }, [getCityFromEvent, handleCityLeave]);

  const handlePointerCancel = useCallback((event: ReactPointerEvent<Element>): void => {
    if (!supportsPointerEvents()) {
      return;
    }
    const city = getCityFromEvent(event);
    if (!city) {
      return;
    }
    handleCityLeave(city);
  }, [getCityFromEvent, handleCityLeave]);

  const handleMouseEnter = useCallback((event: ReactMouseEvent<Element>): void => {
    if (supportsPointerEvents()) {
      return;
    }
    const city = getCityFromEvent(event);
    if (!city) {
      return;
    }
    handleCityEnter(city, event.currentTarget, toTooltipPoint(event));
  }, [getCityFromEvent, handleCityEnter]);

  const handleMouseLeave = useCallback((event: ReactMouseEvent<Element>): void => {
    if (supportsPointerEvents()) {
      return;
    }
    const city = getCityFromEvent(event);
    if (!city) {
      return;
    }
    handleCityLeave(city);
  }, [getCityFromEvent, handleCityLeave]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<Element>): void => {
    if (!supportsPointerEvents()) {
      return;
    }
    const city = getCityFromEvent(event);
    if (!city) {
      return;
    }
    handleCityMove(event.currentTarget, toTooltipPoint(event));
  }, [getCityFromEvent, handleCityMove]);

  const handleMouseMove = useCallback((event: ReactMouseEvent<Element>): void => {
    if (supportsPointerEvents()) {
      return;
    }
    const city = getCityFromEvent(event);
    if (!city) {
      return;
    }
    handleCityMove(event.currentTarget, toTooltipPoint(event));
  }, [getCityFromEvent, handleCityMove]);

  const handleMouseOver = useCallback((event: ReactMouseEvent<Element>): void => {
    const city = getCityFromEvent(event);
    if (!city) {
      return;
    }
    handleCityHover(event, city);
  }, [getCityFromEvent, handleCityHover]);

  const handleClickEvent = useCallback((event: ReactMouseEvent<Element>): void => {
    const city = getCityFromEvent(event);
    if (!city) {
      return;
    }
    handleCityClick(event, city);
  }, [getCityFromEvent, handleCityClick]);

  const handleKeyDownEvent = useCallback((event: ReactKeyboardEvent<Element>): void => {
    const city = getCityFromEvent(event);
    if (!city) {
      return;
    }
    handleCityKeyDown(event, city);
  }, [getCityFromEvent, handleCityKeyDown]);

  const handleFocusEvent = useCallback((event: ReactFocusEvent<Element>): void => {
    const city = getCityFromEvent(event);
    if (!city) {
      return;
    }
    handleCityFocus(city, event.currentTarget);
  }, [getCityFromEvent, handleCityFocus]);

  const handleBlurEvent = useCallback((event: ReactFocusEvent<Element>): void => {
    const city = getCityFromEvent(event);
    if (!city) {
      return;
    }
    handleCityBlur(city);
  }, [getCityFromEvent, handleCityBlur]);

  const getContainerProps = useCallback((): UseTurkeyMapContainerProps => ({
    role: isSelectionEnabled ? "listbox" : "group",
    "aria-label": ariaLabel,
    "aria-multiselectable": selectionMode === "multiple" ? true : undefined,
    "data-tm-map-container": "true",
  }), [ariaLabel, isSelectionEnabled, selectionMode]);

  const getCityProps = useCallback((city: TCity): UseTurkeyMapCityProps => {
    const isDisabled = isCityDisabledResolved(city);
    const isSelected = selectedIdSet.has(city.id);
    const isRoving = city.id === resolvedRovingId;

    return {
      role: isSelectionEnabled ? "option" : "button",
      "aria-label": getCityLabel(city),
      "aria-selected": isSelectionEnabled ? isSelected : undefined,
      "aria-disabled": isDisabled ? "true" : undefined,
      tabIndex: isRoving ? 0 : -1,
      "data-tm-city-id": city.id,
      onPointerEnter: handlePointerEnter,
      onPointerLeave: handlePointerLeave,
      onPointerCancel: handlePointerCancel,
      onPointerMove: showTooltip ? handlePointerMove : undefined,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onMouseOver: hoverable && !isDisabled ? handleMouseOver : undefined,
      onMouseMove: showTooltip ? handleMouseMove : undefined,
      onClick: isDisabled ? undefined : handleClickEvent,
      onKeyDown: handleKeyDownEvent,
      onFocus: handleFocusEvent,
      onBlur: handleBlurEvent,
    };
  }, [
    isSelectionEnabled,
    isCityDisabledResolved,
    selectedIdSet,
    resolvedRovingId,
    showTooltip,
    hoverable,
    handlePointerEnter,
    handlePointerLeave,
    handlePointerCancel,
    handlePointerMove,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseOver,
    handleMouseMove,
    handleClickEvent,
    handleKeyDownEvent,
    handleFocusEvent,
    handleBlurEvent,
  ]);

  const effectiveTooltipVisible = tooltipVisible && visible;

  const getTooltipProps = useCallback((): UseTurkeyMapTooltipProps => ({
    role: "tooltip",
    "aria-hidden": effectiveTooltipVisible ? undefined : true,
    style: {
      ...tooltipStyle,
      pointerEvents: "none",
    },
  }), [effectiveTooltipVisible, tooltipStyle]);

  const cityHandlers = useMemo<UseTurkeyMapHandlers<TCity>>(() => ({
    onEnter: handleCityEnter,
    onLeave: handleCityLeave,
    onMove: (city, element, point) => {
      handleCityMove(element, point);
    },
    onHover: (city, event) => {
      handleCityHover(event, city);
    },
    onClick: (city, event) => {
      handleCityClick(event, city);
    },
    onActivate: handleCityActivate,
    onKeyDown: (city, event) => {
      handleCityKeyDown(event, city);
    },
    onFocus: handleCityFocus,
    onBlur: handleCityBlur,
  }), [
    handleCityEnter,
    handleCityLeave,
    handleCityMove,
    handleCityHover,
    handleCityClick,
    handleCityActivate,
    handleCityKeyDown,
    handleCityFocus,
    handleCityBlur,
  ]);

  const tooltipCity = tooltipCityId === undefined
    ? undefined
    : cityById.get(tooltipCityId);

  return {
    selectedCities: selectedCityObjects,
    selectedIds: effectiveIds,
    rovingCityId: resolvedRovingId,
    focusedCityId,
    tooltipCity,
    tooltipVisible: effectiveTooltipVisible,
    announcement,
    isCityDisabled: isCityDisabledResolved,
    activateCity,
    changeSelection,
    clearSelection,
    getContainerProps,
    getCityProps,
    getTooltipProps,
    cityHandlers,
    registerCityHoverClear,
  };
};

export default useTurkeyMap;
