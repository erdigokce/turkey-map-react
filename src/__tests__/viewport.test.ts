import {
  centerOnPoint,
  clampScale,
  clampViewport,
  defaultMaxZoom,
  defaultMinZoom,
  getResetViewport,
  getViewBoxCenter,
  getViewportTransform,
  getWheelZoomScale,
  isSameViewport,
  normalizeZoomBounds,
  panBy,
  toViewBoxDelta,
  toViewBoxPoint,
  zoomAtPoint,
} from '../viewport';
import type { ViewBoxType, Viewport } from '../types';

const viewBox: ViewBoxType = { top: 0, left: 80, width: 1050, height: 585 };
const bounds = { minZoom: 1, maxZoom: 8 };
const center = getViewBoxCenter(viewBox);

describe('viewport helpers', () => {
  describe('normalizeZoomBounds', () => {
    it('uses defaults when bounds are omitted', () => {
      expect(normalizeZoomBounds()).toEqual({
        minZoom: defaultMinZoom,
        maxZoom: defaultMaxZoom,
        minZoomInvalid: false,
        maxZoomInvalid: false,
        maxZoomAdjusted: false,
      });
    });

    it.each([NaN, Infinity, 0, -1, 0.5])('falls back for invalid minZoom %p', (value) => {
      const result = normalizeZoomBounds(value, 4);

      expect(result.minZoom).toBe(defaultMinZoom);
      expect(result.minZoomInvalid).toBe(true);
      expect(result.maxZoom).toBe(4);
    });

    it.each([NaN, Infinity, 0, -1])('falls back for invalid maxZoom %p', (value) => {
      const result = normalizeZoomBounds(2, value);

      expect(result.minZoom).toBe(2);
      expect(result.maxZoom).toBe(defaultMaxZoom);
      expect(result.maxZoomInvalid).toBe(true);
    });

    it('raises maxZoom to minZoom when it is lower', () => {
      const result = normalizeZoomBounds(4, 2);

      expect(result.minZoom).toBe(4);
      expect(result.maxZoom).toBe(4);
      expect(result.maxZoomAdjusted).toBe(true);
    });

    it('raises an invalid max fallback to a higher min', () => {
      const result = normalizeZoomBounds(20, undefined);

      expect(result.maxZoom).toBe(20);
      expect(result.maxZoomAdjusted).toBe(true);
    });
  });

  describe('clampScale', () => {
    it('clamps to the bounds', () => {
      expect(clampScale(0.5, bounds)).toBe(1);
      expect(clampScale(4, bounds)).toBe(4);
      expect(clampScale(20, bounds)).toBe(8);
    });

    it('falls back to the minimum for non-finite values', () => {
      expect(clampScale(undefined, bounds)).toBe(1);
      expect(clampScale(NaN, bounds)).toBe(1);
      expect(clampScale(Infinity, bounds)).toBe(1);
    });
  });

  describe('clampViewport', () => {
    it('centers and disables panning at the minimum zoom', () => {
      expect(clampViewport({ scale: 1, translateX: 500, translateY: -20 }, viewBox, bounds))
        .toEqual({ scale: 1, translateX: 0, translateY: 0 });
    });

    it('uses the centered translation for non-finite controlled values', () => {
      expect(clampViewport({
        scale: 2,
        translateX: NaN,
        translateY: Infinity,
      }, viewBox, bounds)).toEqual({
        scale: 2,
        translateX: center.x * (1 - 2),
        translateY: center.y * (1 - 2),
      });
    });

    it('clamps translations to the scaled content edges', () => {
      const tooFarRight = clampViewport({
        scale: 2,
        translateX: 1000,
        translateY: 1000,
      }, viewBox, bounds);
      const tooFarLeft = clampViewport({
        scale: 2,
        translateX: -10000,
        translateY: -10000,
      }, viewBox, bounds);

      expect(tooFarRight.translateX).toBe(80 * (1 - 2));
      expect(tooFarRight.translateY).toBe(0 * (1 - 2));
      expect(tooFarLeft.translateX).toBe((80 + 1050) * (1 - 2));
      expect(tooFarLeft.translateY).toBe(585 * (1 - 2));
    });

    it('normalizes an invalid scale', () => {
      expect(clampViewport({ scale: NaN, translateX: 0, translateY: 0 }, viewBox, bounds).scale)
        .toBe(1);
      expect(clampViewport(undefined, viewBox, bounds)).toEqual({
        scale: 1,
        translateX: 0,
        translateY: 0,
      });
    });
  });

  describe('reset and centering', () => {
    it('resets to a centered minimum viewport', () => {
      expect(getResetViewport(bounds, viewBox)).toEqual({
        scale: 1,
        translateX: 0,
        translateY: 0,
      });
    });

    it('centers a higher minimum zoom', () => {
      const result = getResetViewport({ minZoom: 2, maxZoom: 8 }, viewBox);

      expect(result.scale).toBe(2);
      expect(result.translateX).toBe(center.x * (1 - 2));
      expect(result.translateY).toBe(center.y * (1 - 2));
    });

    it('centers an arbitrary content point', () => {
      const result = centerOnPoint(
        { scale: 3, translateX: -300, translateY: -120 },
        { x: 400, y: 300 },
        viewBox,
        bounds,
      );

      expect(result.translateX).toBe(center.x - 3 * 400);
      expect(result.translateY).toBe(center.y - 3 * 300);
    });
  });

  describe('isSameViewport', () => {
    it('treats close values as equal and real differences as different', () => {
      const value: Viewport = { scale: 2, translateX: -100, translateY: -50 };

      expect(isSameViewport(value, { ...value })).toBe(true);
      expect(isSameViewport(value, { ...value, scale: 2.0000001 })).toBe(true);
      expect(isSameViewport(value, { ...value, scale: 2.1 })).toBe(false);
      expect(isSameViewport(value, { ...value, translateX: 0 })).toBe(false);
      expect(isSameViewport(value, { ...value, translateY: 0 })).toBe(false);
    });
  });

  describe('zoomAtPoint', () => {
    it('keeps the anchored content point fixed while scaling', () => {
      const start: Viewport = { scale: 2, translateX: -300, translateY: -120 };
      const point = { x: 500, y: 300 };
      const contentX = (point.x - start.translateX) / start.scale;
      const contentY = (point.y - start.translateY) / start.scale;
      const result = zoomAtPoint(start, point, 4, viewBox, bounds);

      expect(result.scale).toBe(4);
      expect(result.translateX + 4 * contentX).toBeCloseTo(point.x);
      expect(result.translateY + 4 * contentY).toBeCloseTo(point.y);
    });

    it('clamps the requested scale', () => {
      expect(zoomAtPoint(
        { scale: 1, translateX: 0, translateY: 0 },
        center,
        100,
        viewBox,
        bounds,
      ).scale).toBe(8);
      expect(zoomAtPoint(
        { scale: 2, translateX: -100, translateY: -50 },
        center,
        0.1,
        viewBox,
        bounds,
      ).scale).toBe(1);
    });
  });

  describe('panBy', () => {
    it('adds finite deltas and clamps at the edges', () => {
      const start: Viewport = { scale: 2, translateX: -500, translateY: -200 };

      expect(panBy(start, 50, 25, viewBox, bounds)).toEqual({
        scale: 2,
        translateX: -450,
        translateY: -175,
      });
      const clamped = panBy(start, 100000, 100000, viewBox, bounds);
      expect(clamped.scale).toBe(2);
      expect(clamped.translateX).toBe(80 * (1 - 2));
      expect(clamped.translateY).toBeCloseTo(0);
    });

    it('ignores non-finite deltas', () => {
      const start: Viewport = { scale: 2, translateX: -500, translateY: -200 };

      expect(panBy(start, NaN, Infinity, viewBox, bounds)).toEqual(start);
    });
  });

  describe('coordinate conversion', () => {
    const rect = { left: 10, top: 20, width: 1050, height: 585 };

    it('maps client coordinates into the viewBox', () => {
      expect(toViewBoxPoint(10 + 525, 20 + 292.5, rect, viewBox)).toEqual({
        x: 80 + 525,
        y: 292.5,
      });
    });

    it('rejects an unusable rect', () => {
      expect(toViewBoxPoint(0, 0, { ...rect, width: 0 }, viewBox)).toBeUndefined();
      expect(toViewBoxPoint(0, 0, { ...rect, height: -1 }, viewBox)).toBeUndefined();
      expect(toViewBoxPoint(0, 0, { ...rect, left: NaN }, viewBox)).toBeUndefined();
      expect(toViewBoxPoint(NaN, 0, rect, viewBox)).toBeUndefined();
    });

    it('maps client deltas into viewBox deltas', () => {
      expect(toViewBoxDelta(525, 292.5, rect, viewBox)).toEqual({ x: 525, y: 292.5 });
    });

    it('rejects unusable deltas', () => {
      expect(toViewBoxDelta(NaN, 0, rect, viewBox)).toBeUndefined();
      expect(toViewBoxDelta(0, 0, { ...rect, width: 0 }, viewBox)).toBeUndefined();
      expect(toViewBoxDelta(0, 0, { ...rect, height: 0 }, viewBox)).toBeUndefined();
      expect(toViewBoxDelta(1, 1, rect, { ...viewBox, width: Infinity })).toBeUndefined();
    });
  });

  describe('wheel zoom and transform output', () => {
    it('normalizes pixel, line, and page deltas', () => {
      expect(getWheelZoomScale(1, 0, 0, bounds)).toBe(1);
      expect(getWheelZoomScale(1, -100, 0, bounds)).toBeGreaterThan(1);
      expect(getWheelZoomScale(1, 100, 0, bounds)).toBe(1);
      expect(getWheelZoomScale(2, -1, 1, bounds)).toBeGreaterThan(2);
      expect(getWheelZoomScale(2, -1, 2, bounds)).toBeGreaterThan(2);
    });

    it('clamps wheel zoom to the bounds', () => {
      expect(getWheelZoomScale(8, -1000, 0, bounds)).toBe(8);
      expect(getWheelZoomScale(1, 1000, 0, bounds)).toBe(1);
    });

    it('serializes the transform', () => {
      expect(getViewportTransform({ scale: 2, translateX: -100, translateY: -50 }))
        .toBe('translate(-100 -50) scale(2)');
    });
  });
});
