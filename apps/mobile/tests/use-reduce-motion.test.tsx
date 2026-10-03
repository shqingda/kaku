import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReduceMotion } from '@/lib/use-reduce-motion';

const isReduceMotionEnabledMock = jest.mocked(
  AccessibilityInfo.isReduceMotionEnabled,
);
const addEventListenerMock = jest.mocked(AccessibilityInfo.addEventListener);

let changeHandler: ((enabled: boolean) => void) | undefined;
const removeSubscription = jest.fn();

function deferredPreference() {
  let resolve!: (enabled: boolean) => void;
  const promise = new Promise<boolean>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  changeHandler = undefined;
  isReduceMotionEnabledMock.mockResolvedValue(false);
  addEventListenerMock.mockImplementation(
    ((_eventName: string, handler: (enabled: boolean) => void) => {
      changeHandler = handler;
      return { remove: removeSubscription };
    }) as unknown as typeof AccessibilityInfo.addEventListener,
  );
});

describe('useReduceMotion', () => {
  it('reports the system preference when reduce motion is enabled', async () => {
    isReduceMotionEnabledMock.mockResolvedValue(true);

    const { result } = await renderHook<boolean, void>(() => useReduceMotion());
    await act(async () => {});

    expect(result.current).toBe(true);
  });

  it('allows motion after the system preference is confirmed off', async () => {
    const { result } = await renderHook<boolean, void>(() => useReduceMotion());
    await act(async () => {});

    expect(result.current).toBe(false);
  });

  it('keeps motion reduced until the initial preference is known', async () => {
    const preference = deferredPreference();
    isReduceMotionEnabledMock.mockReturnValueOnce(preference.promise);

    const { result } = await renderHook(() => useReduceMotion());
    expect(result.current).toBe(true);

    await act(async () => preference.resolve(false));
    expect(result.current).toBe(false);
  });

  it('shares one native subscription and initial read across consumers', async () => {
    const first = await renderHook(() => useReduceMotion());
    const second = await renderHook(() => useReduceMotion());
    const third = await renderHook(() => useReduceMotion());

    expect(isReduceMotionEnabledMock).toHaveBeenCalledTimes(1);
    expect(addEventListenerMock).toHaveBeenCalledTimes(1);
    expect(addEventListenerMock).toHaveBeenCalledWith(
      'reduceMotionChanged',
      expect.any(Function),
    );
    expect([first.result.current, second.result.current, third.result.current])
      .toEqual([false, false, false]);

    await act(async () => changeHandler?.(true));
    expect([first.result.current, second.result.current, third.result.current])
      .toEqual([true, true, true]);
  });

  it('follows reduceMotionChanged listener updates', async () => {
    const { result } = await renderHook<boolean, void>(() => useReduceMotion());
    await act(async () => {});
    expect(result.current).toBe(false);
    expect(changeHandler).toBeDefined();

    await act(async () => {
      changeHandler?.(true);
    });
    expect(result.current).toBe(true);

    await act(async () => {
      changeHandler?.(false);
    });
    expect(result.current).toBe(false);
  });

  it('removes the listener only after the last consumer leaves and reads again on remount', async () => {
    const first = await renderHook(() => useReduceMotion());
    const second = await renderHook(() => useReduceMotion());

    await first.unmount();
    expect(removeSubscription).not.toHaveBeenCalled();

    await act(async () => changeHandler?.(true));
    expect(second.result.current).toBe(true);

    await second.unmount();
    expect(removeSubscription).toHaveBeenCalledTimes(1);

    const preference = deferredPreference();
    isReduceMotionEnabledMock.mockReturnValueOnce(preference.promise);
    const next = await renderHook(() => useReduceMotion());
    expect(next.result.current).toBe(true);
    expect(isReduceMotionEnabledMock).toHaveBeenCalledTimes(2);
    expect(addEventListenerMock).toHaveBeenCalledTimes(2);

    await act(async () => preference.resolve(false));
    expect(next.result.current).toBe(false);
    await next.unmount();
    expect(removeSubscription).toHaveBeenCalledTimes(2);
  });

  it('does not let a delayed initial read overwrite a newer system event', async () => {
    const preference = deferredPreference();
    isReduceMotionEnabledMock.mockReturnValueOnce(preference.promise);

    const { result } = await renderHook(() => useReduceMotion());
    await act(async () => changeHandler?.(true));
    await act(async () => preference.resolve(false));
    expect(result.current).toBe(true);
  });

  it('ignores reads and events from an unsubscribed session after remount', async () => {
    const previousPreference = deferredPreference();
    const nextPreference = deferredPreference();
    isReduceMotionEnabledMock
      .mockReturnValueOnce(previousPreference.promise)
      .mockReturnValueOnce(nextPreference.promise);

    const first = await renderHook(() => useReduceMotion());
    const previousHandler = changeHandler;
    await first.unmount();
    expect(removeSubscription).toHaveBeenCalledTimes(1);

    const next = await renderHook(() => useReduceMotion());
    await act(async () => {
      previousPreference.resolve(false);
      previousHandler?.(false);
    });
    expect(next.result.current).toBe(true);

    await act(async () => nextPreference.resolve(false));
    expect(next.result.current).toBe(false);
  });

  it('handles an unavailable initial preference and still follows system events', async () => {
    isReduceMotionEnabledMock.mockRejectedValueOnce(new Error('unavailable'));

    const { result } = await renderHook(() => useReduceMotion());
    await act(async () => {});
    expect(result.current).toBe(true);

    await act(async () => changeHandler?.(false));
    expect(result.current).toBe(false);
  });
});
