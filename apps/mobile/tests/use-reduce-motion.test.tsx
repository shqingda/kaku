import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReduceMotion } from '@/lib/use-reduce-motion';

const isReduceMotionEnabledMock = jest.mocked(
  AccessibilityInfo.isReduceMotionEnabled,
);
const addEventListenerMock = jest.mocked(AccessibilityInfo.addEventListener);

let changeHandler: ((enabled: boolean) => void) | undefined;
const removeSubscription = jest.fn();

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

  it('starts with motion allowed when the system preference is off', async () => {
    const { result } = await renderHook<boolean, void>(() => useReduceMotion());
    await act(async () => {});

    expect(result.current).toBe(false);
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

  it('removes the accessibility listener on unmount', async () => {
    const { unmount } = await renderHook<boolean, void>(() =>
      useReduceMotion(),
    );
    await act(async () => {});

    await unmount();

    expect(removeSubscription).toHaveBeenCalledTimes(1);
  });
});
