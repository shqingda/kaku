import { act, renderHook } from '@testing-library/react-native';

import { useScrollDirectionAction } from '@/features/shared/use-scroll-direction-action';

describe('useScrollDirectionAction', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows top only after an upward gesture stays stable, then hides at rest', async () => {
    const { result } = await renderHook(() => useScrollDirectionAction());

    await act(async () => {
      result.current.begin(100);
      result.current.handleScroll(112);
      result.current.handleScroll(130);
      jest.advanceTimersByTime(179);
    });
    expect(result.current.action).toBeNull();

    await act(async () => jest.advanceTimersByTime(1));
    expect(result.current.action).toBe('top');

    await act(async () => jest.advanceTimersByTime(540));
    expect(result.current.action).toBeNull();
  });

  it('debounces reversals and only adopts the direction that settles', async () => {
    const { result } = await renderHook(() => useScrollDirectionAction());

    await act(async () => {
      result.current.begin(200);
      result.current.handleScroll(230);
      jest.advanceTimersByTime(100);
      result.current.handleScroll(198);
      jest.advanceTimersByTime(179);
    });
    expect(result.current.action).toBeNull();

    await act(async () => jest.advanceTimersByTime(1));
    expect(result.current.action).toBe('bottom');
  });

  it('ignores tiny motion and programmatic scrolling outside a gesture', async () => {
    const { result } = await renderHook(() => useScrollDirectionAction());

    await act(async () => {
      result.current.handleScroll(200);
      result.current.begin(200);
      result.current.handleScroll(210);
      jest.advanceTimersByTime(400);
    });

    expect(result.current.action).toBeNull();
  });
});
