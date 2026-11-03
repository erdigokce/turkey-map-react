import React from 'react';
import CoreTurkeyMap from './core';
import { cities } from './data';
import type { Data, TurkeyMapProps } from './types';

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
  RenderTooltipCallback,
  ScaleType,
  SelectionMode,
  SelectionValue,
  TooltipPosition,
  TurkeyMapProps,
  ViewBoxType,
} from './types';

const builtInData: Data = { cities };

const TurkeyMap: React.FC<TurkeyMapProps> = (props) => (
  <CoreTurkeyMap {...props} data={props.data ?? builtInData} />
);

export default TurkeyMap;
