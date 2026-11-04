import React, { forwardRef } from 'react';
import CoreTurkeyMap from './core';
import { cities } from './data';
import type { Data, TurkeyMapProps, TurkeyMapRef } from './types';

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

const builtInData: Data = { cities };

const TurkeyMap = forwardRef<TurkeyMapRef, TurkeyMapProps>((props, ref) => (
  <CoreTurkeyMap {...props} data={props.data ?? builtInData} ref={ref} />
));

TurkeyMap.displayName = 'TurkeyMap';

export default TurkeyMap;
