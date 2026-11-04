import type { ViewBoxType, Viewport } from './types';

export const defaultMinZoom = 1;
export const defaultMaxZoom = 8;

export type ZoomBounds = {
  minZoom: number;
  maxZoom: number;
};

export type NormalizedZoomBounds = ZoomBounds & {
  minZoomInvalid: boolean;
  maxZoomInvalid: boolean;
  maxZoomAdjusted: boolean;
};

export type ViewportPoint = {
  x: number;
  y: number;
};

export type ViewportRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const viewportEpsilon = 1e-6;

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isZoomValue = (value: unknown): value is number => (
  isFiniteNumber(value) && value >= 1
);

export const normalizeZoomBounds = (
  minZoom?: number,
  maxZoom?: number,
): NormalizedZoomBounds => {
  const minZoomInvalid = minZoom !== undefined && !isZoomValue(minZoom);
  const maxZoomInvalid = maxZoom !== undefined && !isZoomValue(maxZoom);
  const resolvedMin = minZoomInvalid || minZoom === undefined
    ? defaultMinZoom
    : minZoom;
  let resolvedMax = maxZoomInvalid || maxZoom === undefined
    ? defaultMaxZoom
    : maxZoom;
  let maxZoomAdjusted = false;

  if (resolvedMax < resolvedMin) {
    resolvedMax = resolvedMin;
    maxZoomAdjusted = true;
  }

  return {
    minZoom: resolvedMin,
    maxZoom: resolvedMax,
    minZoomInvalid,
    maxZoomInvalid,
    maxZoomAdjusted,
  };
};

export const clampScale = (
  value: number | undefined,
  bounds: ZoomBounds,
): number => {
  if (!isFiniteNumber(value)) {
    return bounds.minZoom;
  }

  return Math.min(Math.max(value, bounds.minZoom), bounds.maxZoom);
};

export const getViewBoxCenter = (viewBox: ViewBoxType): ViewportPoint => ({
  x: viewBox.left + viewBox.width / 2,
  y: viewBox.top + viewBox.height / 2,
});

const clampTranslation = (
  value: number,
  start: number,
  size: number,
  scale: number,
): number => {
  const edgeA = (start + size) * (1 - scale);
  const edgeB = start * (1 - scale);
  const lower = Math.min(edgeA, edgeB);
  const upper = Math.max(edgeA, edgeB);
  return Math.min(Math.max(value, lower), upper);
};

export const clampViewport = (
  viewport: Viewport | undefined,
  viewBox: ViewBoxType,
  bounds: ZoomBounds,
): Viewport => {
  const scale = clampScale(viewport?.scale, bounds);
  const center = getViewBoxCenter(viewBox);
  const fallbackX = center.x * (1 - scale);
  const fallbackY = center.y * (1 - scale);
  const rawX = viewport && isFiniteNumber(viewport.translateX)
    ? viewport.translateX
    : fallbackX;
  const rawY = viewport && isFiniteNumber(viewport.translateY)
    ? viewport.translateY
    : fallbackY;

  return {
    scale,
    translateX: clampTranslation(rawX, viewBox.left, viewBox.width, scale),
    translateY: clampTranslation(rawY, viewBox.top, viewBox.height, scale),
  };
};

export const getResetViewport = (
  bounds: ZoomBounds,
  viewBox: ViewBoxType,
): Viewport => {
  const scale = clampScale(bounds.minZoom, bounds);
  const center = getViewBoxCenter(viewBox);
  return clampViewport({
    scale,
    translateX: center.x * (1 - scale),
    translateY: center.y * (1 - scale),
  }, viewBox, bounds);
};

export const isSameViewport = (left: Viewport, right: Viewport): boolean => (
  Math.abs(left.scale - right.scale) <= viewportEpsilon
  && Math.abs(left.translateX - right.translateX) <= viewportEpsilon
  && Math.abs(left.translateY - right.translateY) <= viewportEpsilon
);

export const zoomAtPoint = (
  viewport: Viewport,
  point: ViewportPoint,
  targetScale: number,
  viewBox: ViewBoxType,
  bounds: ZoomBounds,
): Viewport => {
  const current = clampViewport(viewport, viewBox, bounds);
  const scale = clampScale(targetScale, bounds);
  const contentX = (point.x - current.translateX) / current.scale;
  const contentY = (point.y - current.translateY) / current.scale;

  return clampViewport({
    scale,
    translateX: point.x - scale * contentX,
    translateY: point.y - scale * contentY,
  }, viewBox, bounds);
};

export const panBy = (
  viewport: Viewport,
  dx: number,
  dy: number,
  viewBox: ViewBoxType,
  bounds: ZoomBounds,
): Viewport => {
  const current = clampViewport(viewport, viewBox, bounds);
  return clampViewport({
    scale: current.scale,
    translateX: current.translateX + (isFiniteNumber(dx) ? dx : 0),
    translateY: current.translateY + (isFiniteNumber(dy) ? dy : 0),
  }, viewBox, bounds);
};

export const centerOnPoint = (
  viewport: Viewport,
  point: ViewportPoint,
  viewBox: ViewBoxType,
  bounds: ZoomBounds,
): Viewport => {
  const current = clampViewport(viewport, viewBox, bounds);
  const center = getViewBoxCenter(viewBox);
  return clampViewport({
    scale: current.scale,
    translateX: center.x - current.scale * point.x,
    translateY: center.y - current.scale * point.y,
  }, viewBox, bounds);
};

export const toViewBoxPoint = (
  clientX: number,
  clientY: number,
  rect: ViewportRect,
  viewBox: ViewBoxType,
): ViewportPoint | undefined => {
  if (
    !isFiniteNumber(rect.left)
    || !isFiniteNumber(rect.top)
    || !isFiniteNumber(rect.width)
    || !isFiniteNumber(rect.height)
    || rect.width <= 0
    || rect.height <= 0
  ) {
    return undefined;
  }

  const x = viewBox.left + ((clientX - rect.left) / rect.width) * viewBox.width;
  const y = viewBox.top + ((clientY - rect.top) / rect.height) * viewBox.height;

  if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
    return undefined;
  }

  return { x, y };
};

export const toViewBoxDelta = (
  deltaX: number,
  deltaY: number,
  rect: ViewportRect,
  viewBox: ViewBoxType,
): ViewportPoint | undefined => {
  if (
    !isFiniteNumber(deltaX)
    || !isFiniteNumber(deltaY)
    || !isFiniteNumber(rect.width)
    || !isFiniteNumber(rect.height)
    || rect.width <= 0
    || rect.height <= 0
  ) {
    return undefined;
  }

  const x = (deltaX / rect.width) * viewBox.width;
  const y = (deltaY / rect.height) * viewBox.height;

  if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
    return undefined;
  }

  return { x, y };
};

export const getWheelZoomScale = (
  currentScale: number,
  deltaY: number,
  deltaMode: number,
  bounds: ZoomBounds,
): number => {
  const deltaMultiplier = deltaMode === 1 ? 16 : deltaMode === 2 ? 100 : 1;
  const factor = Math.exp(-deltaY * deltaMultiplier * 0.002);
  return clampScale(currentScale * factor, bounds);
};

export const getViewportTransform = (viewport: Viewport): string => (
  `translate(${viewport.translateX} ${viewport.translateY}) scale(${viewport.scale})`
);
