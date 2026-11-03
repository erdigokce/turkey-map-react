import React from 'react';
import CoreTurkeyMap from './core';
import { cities } from './data';
import type { Data, TurkeyMapProps } from './types';

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

const builtInData: Data = { cities };

const TurkeyMap: React.FC<TurkeyMapProps> = (props) => (
  <CoreTurkeyMap {...props} data={props.data ?? builtInData} />
);

export default TurkeyMap;
