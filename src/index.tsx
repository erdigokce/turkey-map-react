import React, { forwardRef } from 'react';
import CoreTurkeyMap from './core';
import { cities } from './data';
import type {
  CityType,
  Data,
  TurkeyMapProps,
  TurkeyMapRef,
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

type TurkeyMapComponent = {
  <TCity extends CityType = CityType>(
    props: TurkeyMapProps<TCity> & { ref?: React.Ref<TurkeyMapRef> },
  ): React.ReactElement;
  displayName?: string;
};

const builtInData: Data = { cities };

const TurkeyMap = forwardRef<TurkeyMapRef, TurkeyMapProps>((props, ref) => (
  <CoreTurkeyMap {...props} data={props.data ?? builtInData} ref={ref} />
)) as unknown as TurkeyMapComponent;

TurkeyMap.displayName = 'TurkeyMap';

export default TurkeyMap;
