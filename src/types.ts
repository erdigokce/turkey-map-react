import type {
  CSSProperties,
  FocusEventHandler,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  KeyboardEventHandler,
  MouseEvent,
  MouseEventHandler,
  PointerEventHandler,
  ReactElement,
  ReactNode,
  SVGAttributes,
} from 'react';
import type { CityType } from './city-type';

export type { Centroid, CityType, Region } from './city-type';

export type Data<TCity extends CityType = CityType> = {
  cities: TCity[];
};

export type SelectionMode = "none" | "single" | "multiple";
export type SelectionValue = string | string[] | null;
export type OnSelectCallback<TCity extends CityType = CityType> = (city: TCity) => void;
export type OnSelectionChangeCallback<TCity extends CityType = CityType> = (
  cities: TCity[],
) => void;
export type OnMaxSelectionReachedCallback<TCity extends CityType = CityType> = (
  city: TCity,
  selectedCities: TCity[],
  maxSelection: number,
) => void;
export type IsCityDisabledCallback<TCity extends CityType = CityType> = (
  city: TCity,
) => boolean;
export type TooltipPosition = "cursor" | "city";
export type RenderTooltipCallback<TCity extends CityType = CityType> = (
  city: TCity,
  value?: unknown,
) => ReactNode;

export type Viewport = {
  scale: number;
  translateX: number;
  translateY: number;
};

export type OnViewportChangeCallback = (viewport: Viewport) => void;

export type TurkeyMapRef = {
  focusCity: (cityId: string, zoom?: number) => void;
  zoomTo: (scale: number) => void;
  resetView: () => void;
};

export type ChoroplethValues = Record<string, number>;
export type ColorScaleFunction = (value: number) => string;
export type ColorScale = string[] | ColorScaleFunction;
export type ScaleType = "linear" | "quantize" | "quantile" | "threshold";
export type GetColorCallback<TCity extends CityType = CityType> = (
  value: number,
  city: TCity,
) => string;

export type CityInteractionState = {
  hovered: boolean;
  selected: boolean;
  disabled: boolean;
  focused: boolean;
};

export type CityStyleGetter<TCity extends CityType = CityType> = (
  city: TCity,
  state: CityInteractionState,
) => CSSProperties | undefined;

export type CityWrapper<TCity extends CityType = CityType> = (
  cityComponent: ReactElement,
  city: TCity,
) => ReactElement;

export type TurkeyMapProps<TCity extends CityType = CityType> = {
  viewBox?: ViewBoxType;
  visible?: boolean;
  hoverable?: boolean;
  customStyle?: CustomStyleType;
  showTooltip?: boolean;
  tooltipText?: string;
  renderTooltip?: RenderTooltipCallback<TCity>;
  tooltipPosition?: TooltipPosition;
  tooltipPortal?: boolean;
  tooltipOffset?: number;
  tooltipDelay?: number;
  disabledCities?: string[];
  isCityDisabled?: IsCityDisabledCallback<TCity>;
  disabledTooltipText?: string;
  data?: Data<TCity>;
  cityWrapper?: CityWrapper<TCity>;
  onHover?: (city: TCity) => void;
  onClick?: (city: TCity) => void;
  selectionMode?: SelectionMode;
  selectedCity?: string | null;
  defaultSelectedCity?: string;
  selectedCities?: string[];
  defaultSelectedCities?: string[];
  maxSelection?: number;
  onSelect?: OnSelectCallback<TCity>;
  onSelectionChange?: OnSelectionChangeCallback<TCity>;
  onMaxSelectionReached?: OnMaxSelectionReachedCallback<TCity>;
  className?: string;
  style?: CSSProperties;
  id?: string;
  containerProps?: HTMLAttributes<HTMLDivElement>;
  svgProps?: SVGAttributes<SVGSVGElement>;
  getCityStyle?: CityStyleGetter<TCity>;
  values?: ChoroplethValues;
  colorScale?: ColorScale;
  scaleType?: ScaleType;
  thresholds?: number[];
  noDataColor?: string;
  getColor?: GetColorCallback<TCity>;
  animateValues?: boolean;
  zoomable?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zoomControls?: boolean;
  viewport?: Viewport;
  onViewportChange?: OnViewportChangeCallback;
  ariaLabel?: string;
  a11yFallback?: boolean;
};

export type CustomStyleType = {
  idleColor: string;
  hoverColor: string;
  selectedColor?: string;
  selectedStroke?: string;
  selectedStrokeWidth?: number;
  disabledColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  focusStroke?: string;
  focusStrokeWidth?: number;
};

export type ViewBoxType = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type UseTurkeyMapPoint = {
  pageX: number;
  pageY: number;
  clientX: number;
  clientY: number;
};

export type UseTurkeyMapOptions<TCity extends CityType = CityType> = {
  data: Data<TCity>;
  visible?: boolean;
  hoverable?: boolean;
  selectionMode?: SelectionMode;
  selectedCity?: string | null;
  defaultSelectedCity?: string;
  selectedCities?: string[];
  defaultSelectedCities?: string[];
  maxSelection?: number;
  onSelect?: OnSelectCallback<TCity>;
  onSelectionChange?: OnSelectionChangeCallback<TCity>;
  onMaxSelectionReached?: OnMaxSelectionReachedCallback<TCity>;
  disabledCities?: string[];
  isCityDisabled?: IsCityDisabledCallback<TCity>;
  onHover?: (city: TCity, event: MouseEvent<Element>) => void;
  onClick?: (city: TCity, event?: MouseEvent<Element>) => void;
  showTooltip?: boolean;
  tooltipPosition?: TooltipPosition;
  tooltipPortal?: boolean;
  tooltipOffset?: number;
  tooltipDelay?: number;
  tooltipAnimationName?: string;
  tooltipRefreshKey?: unknown;
  ariaLabel?: string;
};

export type UseTurkeyMapContainerProps = {
  role: "listbox" | "group";
  "aria-label": string;
  "aria-multiselectable"?: true;
  "data-tm-map-container": string;
};

export type UseTurkeyMapCityProps = {
  role: "option" | "button";
  "aria-label": string;
  "aria-selected"?: boolean;
  "aria-disabled"?: "true";
  tabIndex: 0 | -1;
  "data-tm-city-id": string;
  onPointerEnter?: PointerEventHandler<Element>;
  onPointerLeave?: PointerEventHandler<Element>;
  onPointerCancel?: PointerEventHandler<Element>;
  onPointerMove?: PointerEventHandler<Element>;
  onMouseEnter?: MouseEventHandler<Element>;
  onMouseLeave?: MouseEventHandler<Element>;
  onMouseOver?: MouseEventHandler<Element>;
  onMouseMove?: MouseEventHandler<Element>;
  onClick?: MouseEventHandler<Element>;
  onKeyDown?: KeyboardEventHandler<Element>;
  onFocus?: FocusEventHandler<Element>;
  onBlur?: FocusEventHandler<Element>;
};

export type UseTurkeyMapTooltipProps = {
  role: "tooltip";
  "aria-hidden"?: true;
  style: CSSProperties;
};

export type UseTurkeyMapHandlers<TCity extends CityType = CityType> = {
  onEnter: (city: TCity, element: Element, point: UseTurkeyMapPoint) => void;
  onLeave: (city: TCity) => void;
  onMove: (city: TCity, element: Element, point: UseTurkeyMapPoint) => void;
  onHover: (city: TCity, event: MouseEvent<Element>) => void;
  onClick: (city: TCity, event: MouseEvent<Element>) => void;
  onActivate: (city: TCity, event?: MouseEvent<Element>) => void;
  onKeyDown: (city: TCity, event: ReactKeyboardEvent<Element>) => void;
  onFocus: (city: TCity, element: Element) => void;
  onBlur: (city: TCity) => void;
};

export type UseTurkeyMapResult<TCity extends CityType = CityType> = {
  selectedCities: TCity[];
  selectedIds: string[];
  rovingCityId: string | undefined;
  focusedCityId: string | undefined;
  tooltipCity: TCity | undefined;
  tooltipVisible: boolean;
  announcement: string;
  isCityDisabled: (city: TCity) => boolean;
  activateCity: (city: TCity) => void;
  changeSelection: (ids: string[]) => void;
  clearSelection: () => void;
  getContainerProps: () => UseTurkeyMapContainerProps;
  getCityProps: (city: TCity) => UseTurkeyMapCityProps;
  getTooltipProps: () => UseTurkeyMapTooltipProps;
  cityHandlers: UseTurkeyMapHandlers<TCity>;
  registerCityHoverClear: (cityId: string, clearHover: () => void) => () => void;
};
