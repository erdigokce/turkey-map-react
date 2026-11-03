import { act } from '@testing-library/react';

export const advanceTimers = (milliseconds: number): void => {
  act(() => {
    jest.advanceTimersByTime(milliseconds);
  });
};

type MatchMediaListener = (event: { matches: boolean }) => void;

type MatchMediaOptions = {
  legacy?: boolean;
  noListener?: boolean;
};

export type MatchMediaController = {
  change: (matches: boolean) => void;
  mediaQuery: {
    matches: boolean;
    addEventListener?: jest.Mock;
    removeEventListener?: jest.Mock;
    addListener?: jest.Mock;
    removeListener?: jest.Mock;
  };
  restore: () => void;
};

export const installMatchMedia = (
  matches: boolean,
  options: MatchMediaOptions = {},
): MatchMediaController => {
  const listeners = new Set<MatchMediaListener>();
  const originalMatchMedia = window.matchMedia;

  const mediaQuery = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    dispatchEvent: jest.fn(),
  } as MatchMediaController['mediaQuery'];

  if (!options.noListener) {
    if (options.legacy) {
      mediaQuery.addListener = jest.fn((listener: MatchMediaListener) => {
        listeners.add(listener);
      });
      mediaQuery.removeListener = jest.fn((listener: MatchMediaListener) => {
        listeners.delete(listener);
      });
    } else {
      mediaQuery.addEventListener = jest.fn((type: string, listener: MatchMediaListener) => {
        if (type === 'change') {
          listeners.add(listener);
        }
      });
      mediaQuery.removeEventListener = jest.fn((type: string, listener: MatchMediaListener) => {
        if (type === 'change') {
          listeners.delete(listener);
        }
      });
    }
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn(() => mediaQuery),
  });

  const change = (nextMatches: boolean): void => {
    mediaQuery.matches = nextMatches;
    act(() => {
      listeners.forEach((listener) => listener({ matches: nextMatches }));
    });
  };

  return {
    change,
    mediaQuery,
    restore: () => {
      if (originalMatchMedia === undefined) {
        delete (window as unknown as { matchMedia?: typeof window.matchMedia }).matchMedia;
        return;
      }
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    },
  };
};

export const installPointerEvent = (): (() => void) => {
  const originalPointerEvent = (window as unknown as { PointerEvent?: typeof PointerEvent }).PointerEvent;

  class MockPointerEvent extends MouseEvent {
    pointerType: string;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init as MouseEventInit);
      this.pointerType = (init as { pointerType?: string }).pointerType ?? 'mouse';
    }
  }

  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: MockPointerEvent,
  });

  return () => {
    if (originalPointerEvent === undefined) {
      delete (window as unknown as { PointerEvent?: typeof PointerEvent }).PointerEvent;
      return;
    }
    Object.defineProperty(window, 'PointerEvent', {
      configurable: true,
      writable: true,
      value: originalPointerEvent,
    });
  };
};

export const mockCityBounds = (
  element: Element,
  bounds: { left: number; top: number; width: number; height: number },
): jest.SpyInstance => (
  jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    ...bounds,
    right: bounds.left + bounds.width,
    bottom: bounds.top + bounds.height,
    x: bounds.left,
    y: bounds.top,
    toJSON: () => ({}),
  } as DOMRect)
);
