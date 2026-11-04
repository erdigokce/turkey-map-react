import type { Viewport } from '../src/types';

export type RectInput = {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
};

const toDomRect = ({
  left = 0,
  top = 0,
  width = 1050,
  height = 585,
}: RectInput): DOMRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
  x: left,
  y: top,
  toJSON: () => ({}),
} as DOMRect);

export const mockSvgRect = (
  element: Element,
  input: RectInput = {},
): jest.SpyInstance => (
  jest.spyOn(element, 'getBoundingClientRect').mockReturnValue(toDomRect(input))
);

export const mockCityRect = (
  element: Element,
  input: RectInput = {},
): jest.SpyInstance => (
  jest.spyOn(element, 'getBoundingClientRect').mockReturnValue(toDomRect(input))
);

export const mockCityBBox = (
  element: Element,
  box: { x?: number; y?: number; width?: number; height?: number } = {},
): jest.Mock => {
  const value = {
    x: box.x ?? 0,
    y: box.y ?? 0,
    width: box.width ?? 10,
    height: box.height ?? 10,
    top: box.y ?? 0,
    left: box.x ?? 0,
    right: (box.x ?? 0) + (box.width ?? 10),
    bottom: (box.y ?? 0) + (box.height ?? 10),
  };
  const getBBox = jest.fn(() => value);
  Object.defineProperty(element, 'getBBox', {
    configurable: true,
    value: getBBox,
  });
  return getBBox;
};

export const getProvinceGroupTransform = (container: HTMLElement): string | null => {
  const group = container.querySelector('g#turkiye');
  return group ? group.getAttribute('transform') : null;
};

export const parseTransform = (transform: string | null): Viewport | undefined => {
  if (!transform) {
    return undefined;
  }

  const match = /^translate\((-?[\d.]+) (-?[\d.]+)\) scale\((-?[\d.]+)\)$/.exec(transform);
  if (!match) {
    return undefined;
  }

  return {
    translateX: Number(match[1]),
    translateY: Number(match[2]),
    scale: Number(match[3]),
  };
};

export const dispatchWheel = (
  element: Element,
  init: WheelEventInit,
): WheelEvent => {
  const event = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  element.dispatchEvent(event);
  return event;
};
