import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TurkeyMap from '../index';
import { testData } from '../../tests/fixtures/cities';
import { getCityGroup, getTooltip } from '../../tests/helpers';
import { advanceTimers, installMatchMedia } from '../../tests/tooltip-helpers';

describe('TurkeyMap tooltip reduced motion', () => {
  let restoreMatchMedia: (() => void) | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    restoreMatchMedia?.();
    restoreMatchMedia = undefined;
  });

  const revealAndHide = (container: HTMLElement): HTMLElement => {
    const tooltip = getTooltip(container);
    const group = getCityGroup(container, 'Alpha');

    fireEvent.mouseEnter(group);
    advanceTimers(80);
    expect(tooltip).toHaveStyle({ visibility: 'visible' });

    fireEvent.mouseLeave(group);
    advanceTimers(80);

    return tooltip;
  };

  it('hides immediately when matchMedia is unavailable', () => {
    delete (window as unknown as { matchMedia?: typeof window.matchMedia }).matchMedia;
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = revealAndHide(container);

    expect(tooltip).toHaveStyle({ visibility: 'hidden' });
    expect(tooltip.style.animation).toBe('');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies the fade animation when motion is allowed', () => {
    const matchMedia = installMatchMedia(false);
    restoreMatchMedia = matchMedia.restore;
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = revealAndHide(container);

    expect(tooltip.style.animation).toContain('turkey_react_map_tooltip_fade_out');
    expect(tooltip.style.visibility).toBe('');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses the new preference after a runtime media-query change', () => {
    const matchMedia = installMatchMedia(false);
    restoreMatchMedia = matchMedia.restore;
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = getTooltip(container);
    const group = getCityGroup(container, 'Alpha');

    fireEvent.mouseEnter(group);
    advanceTimers(80);

    matchMedia.change(true);

    fireEvent.mouseLeave(group);
    advanceTimers(80);

    expect(tooltip).toHaveStyle({ visibility: 'hidden' });
    expect(tooltip.style.animation).toBe('');
  });

  it('can switch from reduced motion back to animated hiding', () => {
    const matchMedia = installMatchMedia(true);
    restoreMatchMedia = matchMedia.restore;
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = getTooltip(container);
    const group = getCityGroup(container, 'Alpha');

    fireEvent.mouseEnter(group);
    advanceTimers(80);

    matchMedia.change(false);

    fireEvent.mouseLeave(group);
    advanceTimers(80);

    expect(tooltip.style.animation).toContain('turkey_react_map_tooltip_fade_out');
  });

  it('supports the legacy addListener API', () => {
    const matchMedia = installMatchMedia(false, { legacy: true });
    restoreMatchMedia = matchMedia.restore;
    const { container, unmount } = render(
      <TurkeyMap data={testData} showTooltip={true} />,
    );
    const tooltip = getTooltip(container);
    const group = getCityGroup(container, 'Alpha');

    expect(matchMedia.mediaQuery.addListener).toHaveBeenCalled();

    fireEvent.mouseEnter(group);
    advanceTimers(80);
    matchMedia.change(true);
    fireEvent.mouseLeave(group);
    advanceTimers(80);

    expect(tooltip).toHaveStyle({ visibility: 'hidden' });
    expect(tooltip.style.animation).toBe('');

    unmount();

    expect(matchMedia.mediaQuery.removeListener).toHaveBeenCalled();
  });

  it('falls back to non-animated behavior when the query exposes no listener API', () => {
    const matchMedia = installMatchMedia(true, { noListener: true });
    restoreMatchMedia = matchMedia.restore;
    const { container } = render(<TurkeyMap data={testData} showTooltip={true} />);
    const tooltip = revealAndHide(container);

    expect(tooltip).toHaveStyle({ visibility: 'hidden' });
    expect(tooltip.style.animation).toBe('');
  });

  it('removes the media-query listener on unmount', () => {
    const matchMedia = installMatchMedia(false);
    restoreMatchMedia = matchMedia.restore;
    const { unmount } = render(<TurkeyMap data={testData} showTooltip={true} />);

    unmount();

    expect(matchMedia.mediaQuery.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });
});
