/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import React, { MouseEvent } from 'react';

export type CountyType = { id: number, countyName: string, cityId: number, priority: number, path: string | null, subregions: string };
export type Counties = CountyType[][];
export type CityType = { id: string; plateNumber: number; name: string; path: string };
export type CustomStyleType = { idleColor: string, hoverColor: string };
export type ViewBoxType = { top: number; left: number; width: number; height: number };
export type GetCitiesReturn = { element: JSX.Element, cityType: CityType };
export type GetCountiesReturn = { element: JSX.Element, countyType: CountyType };

export type CityWrapperType = (cityComponent: JSX.Element, city: CityType) => JSX.Element;
export type CountyWrapperType = (countyComponent: JSX.Element, county: CountyType) => JSX.Element;

export type OnMouseEventCallback = (event: MouseEvent, areaType: CityType | CountyType) => void | undefined;
export type OnMouseEvent = (event: MouseEvent, callback?: OnMouseEventCallback) => void;
export type OnMouseMoveCallback = () => void | undefined;
export type OnMouseMove = (event: MouseEvent<Element, MouseEvent>, callback: OnMouseMoveCallback) => void;
