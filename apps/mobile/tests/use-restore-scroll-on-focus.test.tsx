import { act, renderHook } from '@testing-library/react-native';

import { useRestoreScrollOnFocus } from '@/features/shared/use-restore-scroll-on-focus';

const mockListeners: Record<
  string,
  (event: { data?: { closing?: boolean } }) => void
> = {};

const mockAddListener = jest.fn(
  (
    event: string,
    handler: (payload: { data?: { closing?: boolean } }) => void,
  ) => {
    mockListeners[event] = handler;
    return jest.fn(() => {
      delete mockListeners[event];
    });
  },
);

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({ addListener: mockAddListener }),
    useFocusEffect: (callback: () => (() => void) | void) => {
      useEffect(() => callback(), [callback]);
    },
  };
});

function emit(
  event: 'transitionStart' | 'transitionEnd',
  closing: boolean,
) {
  mockListeners[event]?.({ data: { closing } });
}

function scrollTo(
  result: { current: { handleScroll: (event: { nativeEvent: { contentOffset: { y: number } } }) => void } },
  y: number,
) {
  result.current.handleScroll({
    nativeEvent: { contentOffset: { y } },
  });
}

describe('useRestoreScrollOnFocus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockListeners).forEach((key) => {
      delete mockListeners[key];
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('freezes the offset on close and restores it when the screen reappears', async () => {
    const scrollToNative = jest.fn();
    const scrollRef = { current: { scrollTo: scrollToNative } };

    const { result } = await renderHook(() =>
      useRestoreScrollOnFocus(scrollRef),
    );

    scrollTo(result, 120);
    await act(async () => {
      emit('transitionStart', true);
    });

    // 转场过程中系统改偏移，不能污染冻结值。
    scrollTo(result, 48);

    await act(async () => {
      emit('transitionStart', false);
      emit('transitionEnd', false);
    });

    expect(scrollToNative).toHaveBeenCalledWith({
      animated: false,
      y: 120.01,
    });
    expect(scrollToNative).toHaveBeenCalledWith({
      animated: false,
      y: 120,
    });
  });

  it('rejects late native offset changes during the guard window', async () => {
    const scrollToNative = jest.fn();
    const scrollRef = { current: { scrollTo: scrollToNative } };

    const { result } = await renderHook(() =>
      useRestoreScrollOnFocus(scrollRef),
    );

    scrollTo(result, 0);
    await act(async () => {
      emit('transitionStart', true);
      emit('transitionStart', false);
      emit('transitionEnd', false);
    });

    scrollToNative.mockClear();
    scrollTo(result, 36);

    expect(scrollToNative).toHaveBeenCalledWith({
      animated: false,
      y: 0.01,
    });
    expect(scrollToNative).toHaveBeenCalledWith({
      animated: false,
      y: 0,
    });
  });

  it('falls back to restoring when transitionEnd never fires', async () => {
    const scrollToNative = jest.fn();
    const scrollRef = { current: { scrollTo: scrollToNative } };

    const { result } = await renderHook(() =>
      useRestoreScrollOnFocus(scrollRef),
    );

    scrollTo(result, 80);
    await act(async () => {
      emit('transitionStart', true);
      emit('transitionStart', false);
    });

    expect(scrollToNative).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(420);
    });

    expect(scrollToNative).toHaveBeenCalledWith({
      animated: false,
      y: 80,
    });
  });
});
