import { act, renderHook } from '@testing-library/react-native';

import { useScrollDirectionAction } from '@/features/shared/use-scroll-direction-action';

describe('useScrollDirectionAction', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows top after downward browsing settles and keeps it at rest', async () => {
    const { result } = await renderHook(() => useScrollDirectionAction());

    await act(async () => {
      result.current.begin(100);
      result.current.handleScroll(112, 1000);
      result.current.handleScroll(130, 1000);
      jest.advanceTimersByTime(179);
    });
    expect(result.current.action).toBeNull();

    await act(async () => jest.advanceTimersByTime(1));
    expect(result.current.action).toBe('top');

    await act(async () => jest.advanceTimersByTime(2000));
    expect(result.current.action).toBe('top');
  });

  it('debounces reversals and only adopts the direction that settles', async () => {
    const { result } = await renderHook(() => useScrollDirectionAction());

    await act(async () => {
      result.current.begin(200);
      result.current.handleScroll(230, 1000);
      jest.advanceTimersByTime(100);
      result.current.handleScroll(198, 1000);
      jest.advanceTimersByTime(179);
    });
    expect(result.current.action).toBeNull();

    await act(async () => jest.advanceTimersByTime(1));
    expect(result.current.action).toBe('bottom');
  });

  it('ignores tiny motion and programmatic scrolling outside a gesture', async () => {
    const { result } = await renderHook(() => useScrollDirectionAction());

    await act(async () => {
      result.current.handleScroll(200, 1000);
      result.current.begin(200);
      result.current.handleScroll(210, 1000);
      jest.advanceTimersByTime(400);
    });

    expect(result.current.action).toBeNull();
  });

  it('hides the action at either end of the list', async () => {
    const { result } = await renderHook(() => useScrollDirectionAction());

    await act(async () => {
      result.current.begin(100);
      result.current.handleScroll(130, 1000);
      jest.advanceTimersByTime(180);
    });
    expect(result.current.action).toBe('top');

    await act(async () => result.current.handleScroll(1000, 1000));
    expect(result.current.action).toBeNull();

    await act(async () => {
      result.current.begin(900);
      result.current.handleScroll(860, 1000);
      jest.advanceTimersByTime(180);
    });
    expect(result.current.action).toBe('bottom');

    await act(async () => result.current.handleScroll(0, 1000));
    expect(result.current.action).toBeNull();
  });
});
