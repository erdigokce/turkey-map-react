import type {
  CSSProperties,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  SVGAttributes,
} from 'react';
import type { CityType } from './city-type';

export type { CityType } from './city-type';

export type Data = {
  cities: CityType[];
};

export type SelectionMode = "none" | "single" | "multiple";
export type SelectionValue = string | string[] | null;
export type OnSelectCallback = (city: CityType) => void;
export type OnSelectionChangeCallback = (cities: CityType[]) => void;
export type OnMaxSelectionReachedCallback = (
  city: CityType,
  selectedCities: CityType[],
  maxSelection: number,
) => void;
export type IsCityDisabledCallback = (city: CityType) => boolean;
export type TooltipPosition = "cursor" | "city";
export type RenderTooltipCallback = (city: CityType, value?: unknown) => ReactNode;

export type CityInteractionState = {
  hovered: boolean;
  selected: boolean;
  disabled: boolean;
  focused: boolean;
};

export type CityStyleGetter = (
  city: CityType,
  state: CityInteractionState,
) => CSSProperties | undefined;

export type CityWrapper = (
  cityComponent: ReactElement,
  city: CityType,
) => ReactElement;

export type TurkeyMapProps = {
  viewBox?: ViewBoxType;
  visible?: boolean;
  hoverable?: boolean;
  customStyle?: CustomStyleType;
  showTooltip?: boolean;
  tooltipText?: string;
  renderTooltip?: RenderTooltipCallback;
  tooltipPosition?: TooltipPosition;
  tooltipPortal?: boolean;
  tooltipOffset?: number;
  tooltipDelay?: number;
  disabledCities?: string[];
  isCityDisabled?: IsCityDisabledCallback;
  disabledTooltipText?: string;
  data?: Data;
  cityWrapper?: CityWrapper;
  onHover?: (city: CityType) => void;
  onClick?: (city: CityType) => void;
  selectionMode?: SelectionMode;
  selectedCity?: string | null;
  defaultSelectedCity?: string;
  selectedCities?: string[];
  defaultSelectedCities?: string[];
  maxSelection?: number;
  onSelect?: OnSelectCallback;
  onSelectionChange?: OnSelectionChangeCallback;
  onMaxSelectionReached?: OnMaxSelectionReachedCallback;
  className?: string;
  style?: CSSProperties;
  id?: string;
  containerProps?: HTMLAttributes<HTMLDivElement>;
  svgProps?: SVGAttributes<SVGSVGElement>;
  getCityStyle?: CityStyleGetter;
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
