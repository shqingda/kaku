import { act, fireEvent, render } from '@testing-library/react-native';
import { useRef } from 'react';
import { Text } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { AppSheet } from '@/features/shared/app-sheet';
import { useReduceMotion } from '@/lib/use-reduce-motion';

const mockPanCallbacks: {
  onBegin?: () => void;
  onStart?: (event: { translationY: number }) => void;
  onEnd?: (event: { translationY: number; velocityY: number }, success: boolean) => void;
  onUpdate?: (event: { translationY: number }) => void;
} = {};
let mockWindowHeight = 800;

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 400, height: mockWindowHeight, scale: 1, fontScale: 1 }),
}));

jest.mock('@/lib/use-reduce-motion', () => ({
  useReduceMotion: jest.fn(() => false),
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  let pan: Record<string, jest.Mock>;
  pan = {
    enabled: jest.fn(() => pan),
    activeOffsetY: jest.fn(() => pan),
    failOffsetX: jest.fn(() => pan),
    onBegin: jest.fn((callback: () => void) => {
      mockPanCallbacks.onBegin = callback;
      return pan;
    }),
    onStart: jest.fn((callback: typeof mockPanCallbacks.onStart) => {
      mockPanCallbacks.onStart = callback;
      return pan;
    }),
    onEnd: jest.fn((callback: typeof mockPanCallbacks.onEnd) => {
      mockPanCallbacks.onEnd = callback;
      return pan;
    }),
    onUpdate: jest.fn((callback: typeof mockPanCallbacks.onUpdate) => {
      mockPanCallbacks.onUpdate = callback;
      return pan;
    }),
  };

  return {
    Gesture: { Pan: () => pan },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

const mockUseReduceMotion = jest.mocked(useReduceMotion);

describe('AppSheet', () => {
  const sharedValues: Array<{ value: unknown }> = [];

  beforeEach(() => {
    mockUseReduceMotion.mockReturnValue(false);
    mockWindowHeight = 800;
    delete mockPanCallbacks.onBegin;
    delete mockPanCallbacks.onStart;
    delete mockPanCallbacks.onEnd;
    delete mockPanCallbacks.onUpdate;
    sharedValues.length = 0;
    jest.spyOn(Reanimated, 'useSharedValue').mockImplementation(<T,>(initial: T) => {
      const ref = useRef({ value: initial } as Reanimated.SharedValue<T>);
      if (!sharedValues.includes(ref.current)) sharedValues.push(ref.current);
      return ref.current;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('keeps an initially hidden sheet out of the accessibility tree', async () => {
    const screen = await render(
      <AppSheet onClose={jest.fn()} visible={false}>
        <Text>筛选选项</Text>
      </AppSheet>,
    );

    expect(screen.queryByText('筛选选项')).toBeNull();
  });

  it('renders content and reports the completed entrance', async () => {
    const onEntered = jest.fn();
    const screen = await render(
      <AppSheet onClose={jest.fn()} onEntered={onEntered} visible>
        <Text>筛选选项</Text>
      </AppSheet>,
    );

    expect(screen.getByText('筛选选项')).toBeTruthy();
    expect(onEntered).toHaveBeenCalledTimes(1);
  });

  it('forwards backdrop press and accessibility escape to onClose', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <AppSheet onClose={onClose} visible>
        <Text>筛选选项</Text>
      </AppSheet>,
    );

    await fireEvent.press(
      screen.getByLabelText('关闭', { includeHiddenElements: true }),
    );
    fireEvent(screen.getByText('筛选选项').parent!, 'accessibilityEscape');

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('unmounts its content after the parent hides it', async () => {
    const screen = await render(
      <AppSheet onClose={jest.fn()} visible>
        <Text>筛选选项</Text>
      </AppSheet>,
    );

    await screen.rerender(
      <AppSheet onClose={jest.fn()} visible={false}>
        <Text>筛选选项</Text>
      </AppSheet>,
    );

    expect(screen.queryByText('筛选选项')).toBeNull();
  });

  it('uses the reduced-motion entrance without losing completion', async () => {
    mockUseReduceMotion.mockReturnValue(true);
    const onEntered = jest.fn();

    const screen = await render(
      <AppSheet onClose={jest.fn()} onEntered={onEntered} visible>
        <Text>筛选选项</Text>
      </AppSheet>,
    );

    expect(screen.getByText('筛选选项')).toBeTruthy();
    expect(onEntered).toHaveBeenCalledTimes(1);
  });

  it('reports entrance again when the same sheet reopens', async () => {
    const onEntered = jest.fn();
    const content = (visible: boolean) => (
      <AppSheet onClose={jest.fn()} onEntered={onEntered} visible={visible}>
        <Text>筛选选项</Text>
      </AppSheet>
    );
    const screen = await render(content(true));
    await screen.rerender(content(false));
    await screen.rerender(content(true));

    expect(screen.getByText('筛选选项')).toBeTruthy();
    expect(onEntered).toHaveBeenCalledTimes(2);
  });

  it('reopens a closing sheet from its current position and backdrop', async () => {
    const spring = jest.spyOn(Reanimated, 'withSpring');
    const content = (visible: boolean) => (
      <AppSheet onClose={jest.fn()} visible={visible}><Text>筛选选项</Text></AppSheet>
    );
    const screen = await render(content(true));
    spring.mockImplementationOnce(() => 180);
    await screen.rerender(content(false));
    sharedValues[2].value = 0.6;
    let resumedPosition: unknown;
    let resumedBackdrop: unknown;
    spring.mockImplementationOnce(() => {
      resumedPosition = sharedValues[0].value;
      resumedBackdrop = sharedValues[2].value;
      return 90;
    });

    await screen.rerender(content(true));

    expect(resumedPosition).toBe(180);
    expect(resumedBackdrop).toBe(0.6);
  });

  it.each([false, true])('ignores an earlier close completion during a later close cycle (reduced motion: %s)', async (reduced) => {
    mockUseReduceMotion.mockReturnValue(reduced);
    const animate = reduced
      ? jest.spyOn(Reanimated, 'withTiming')
      : jest.spyOn(Reanimated, 'withSpring');
    const content = (visible: boolean) => (
      <AppSheet onClose={jest.fn()} visible={visible}><Text>筛选选项</Text></AppSheet>
    );
    const screen = await render(content(true));
    let oldClose: ((finished?: boolean) => void) | undefined;
    let currentClose: ((finished?: boolean) => void) | undefined;
    animate.mockImplementationOnce((_target, _config, callback) => {
      oldClose = callback;
      return 180;
    });
    await screen.rerender(content(false));
    await screen.rerender(content(true));
    animate.mockImplementationOnce((_target, _config, callback) => {
      currentClose = callback;
      return 90;
    });
    await screen.rerender(content(false));

    await act(() => oldClose?.(true));
    expect(screen.queryByText('筛选选项')).not.toBeNull();

    await act(() => currentClose?.(true));
    expect(screen.queryByText('筛选选项')).toBeNull();
  });

  it('only completes entrance for the current opening cycle', async () => {
    const spring = jest.spyOn(Reanimated, 'withSpring');
    const onEntered = jest.fn();
    let oldEntrance: ((finished?: boolean) => void) | undefined;
    let currentEntrance: ((finished?: boolean) => void) | undefined;
    spring.mockImplementationOnce((_target, _config, callback) => {
      oldEntrance = callback;
      return 120;
    });
    const content = (visible: boolean) => (
      <AppSheet onClose={jest.fn()} onEntered={onEntered} visible={visible}>
        <Text>筛选选项</Text>
      </AppSheet>
    );
    const screen = await render(content(true));
    spring.mockImplementationOnce(() => 180);
    await screen.rerender(content(false));
    spring.mockImplementationOnce((_target, _config, callback) => {
      currentEntrance = callback;
      return 90;
    });
    await screen.rerender(content(true));

    await act(() => oldEntrance?.(true));
    expect(onEntered).not.toHaveBeenCalled();
    await act(() => { currentEntrance?.(true); currentEntrance?.(true); });
    expect(onEntered).toHaveBeenCalledTimes(1);
  });

  it('keeps its displayed position when the window changes size', async () => {
    const spring = jest.spyOn(Reanimated, 'withSpring');
    const content = <AppSheet onClose={jest.fn()} visible><Text>筛选选项</Text></AppSheet>;
    const screen = await render(content);
    sharedValues[0].value = 120;
    let resumedPosition: unknown;
    spring.mockImplementationOnce(() => {
      resumedPosition = sharedValues[0].value;
      return 60;
    });
    mockWindowHeight = 900;

    await screen.rerender(<AppSheet onClose={jest.fn()} visible><Text>筛选选项</Text></AppSheet>);

    expect(resumedPosition).toBe(120);
  });

  it('settles when reduced motion is enabled and does not replay when it is disabled', async () => {
    const spring = jest.spyOn(Reanimated, 'withSpring');
    const content = () => <AppSheet onClose={jest.fn()} visible><Text>筛选选项</Text></AppSheet>;
    const screen = await render(content());
    sharedValues[0].value = 120;
    mockUseReduceMotion.mockReturnValue(true);
    await screen.rerender(content());
    expect(sharedValues[0].value).toBe(0);
    let resumedPosition: unknown;
    spring.mockImplementationOnce(() => {
      resumedPosition = sharedValues[0].value;
      return 0;
    });
    mockUseReduceMotion.mockReturnValue(false);

    await screen.rerender(content());

    expect(resumedPosition).toBe(0);
  });

  it('closes after a downward fling with the release velocity', async () => {
    const spring = jest.spyOn(Reanimated, 'withSpring');
    const onClose = jest.fn();
    const screen = await render(
      <AppSheet onClose={onClose} visible>
        <Text>筛选选项</Text>
      </AppSheet>,
    );
    const sheet = screen.getByText('筛选选项').parent!;
    fireEvent(sheet, 'layout', { nativeEvent: { layout: { height: 400 } } });

    mockPanCallbacks.onStart?.({ translationY: 15 });
    mockPanCallbacks.onUpdate?.({ translationY: 50 });
    mockPanCallbacks.onEnd?.({ translationY: 50, velocityY: 2_000 }, true);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(spring).toHaveBeenLastCalledWith(
      expect.any(Number), expect.objectContaining({ velocity: 2_000 }), expect.any(Function),
    );
  });

  it('springs back without closing after a short slow drag', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <AppSheet onClose={onClose} visible>
        <Text>筛选选项</Text>
      </AppSheet>,
    );
    fireEvent(screen.getByText('筛选选项').parent!, 'layout', {
      nativeEvent: { layout: { height: 400 } },
    });

    mockPanCallbacks.onStart?.({ translationY: 13 });
    mockPanCallbacks.onUpdate?.({ translationY: 20 });
    mockPanCallbacks.onEnd?.({ translationY: 20, velocityY: 50 }, true);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not interrupt an animation for a touch that never becomes a drag', async () => {
    const cancel = jest.spyOn(Reanimated, 'cancelAnimation');
    await render(<AppSheet onClose={jest.fn()} visible><Text>筛选选项</Text></AppSheet>);

    mockPanCallbacks.onBegin?.();

    expect(cancel).not.toHaveBeenCalled();
  });

  it.each([120, -30])('continues a moving sheet from its displayed offset %s', async (offset) => {
    await render(<AppSheet onClose={jest.fn()} visible><Text>筛选选项</Text></AppSheet>);
    sharedValues[0].value = offset;

    mockPanCallbacks.onStart?.({ translationY: 15 });
    mockPanCallbacks.onUpdate?.({ translationY: 15 });
    expect(sharedValues[0].value).toBeCloseTo(offset);

    mockPanCallbacks.onUpdate?.({ translationY: 25 });
    expect(sharedValues[0].value).toBeGreaterThan(offset);
    expect(sharedValues[0].value).toBeLessThanOrEqual(offset + 10);
  });

  it('uses the displayed distance and lets an upward reversal keep the sheet open', async () => {
    const onClose = jest.fn();
    const spring = jest.spyOn(Reanimated, 'withSpring');
    await render(<AppSheet onClose={onClose} visible><Text>筛选选项</Text></AppSheet>);
    sharedValues[0].value = 400;

    mockPanCallbacks.onStart?.({ translationY: -15 });
    mockPanCallbacks.onEnd?.({ translationY: -15, velocityY: -1_000 }, true);

    expect(onClose).not.toHaveBeenCalled();
    expect(spring).toHaveBeenLastCalledWith(
      0, expect.objectContaining({ velocity: -1_000 }), expect.any(Function),
    );

    sharedValues[0].value = 400;
    mockPanCallbacks.onStart?.({ translationY: 15 });
    mockPanCallbacks.onEnd?.({ translationY: 15, velocityY: 0 }, true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns a cancelled active drag without closing or repeating entrance focus', async () => {
    const onClose = jest.fn();
    const onEntered = jest.fn();
    const spring = jest.spyOn(Reanimated, 'withSpring');
    await render(
      <AppSheet onClose={onClose} onEntered={onEntered} visible><Text>筛选选项</Text></AppSheet>,
    );
    mockPanCallbacks.onStart?.({ translationY: 15 });
    mockPanCallbacks.onUpdate?.({ translationY: 400 });
    mockPanCallbacks.onEnd?.({ translationY: 400, velocityY: 2_000 }, false);

    expect(onClose).not.toHaveBeenCalled();
    expect(onEntered).toHaveBeenCalledTimes(1);
    expect(spring).toHaveBeenLastCalledWith(
      0, expect.objectContaining({ velocity: 0 }), expect.any(Function),
    );
  });

  it('completes entrance focus after the initial animation was interrupted by a drag', async () => {
    jest.spyOn(Reanimated, 'withSpring').mockImplementationOnce(() => 120);
    const onEntered = jest.fn();
    await render(
      <AppSheet onClose={jest.fn()} onEntered={onEntered} visible><Text>筛选选项</Text></AppSheet>,
    );
    expect(onEntered).not.toHaveBeenCalled();

    mockPanCallbacks.onStart?.({ translationY: 15 });
    mockPanCallbacks.onEnd?.({ translationY: 15, velocityY: -500 }, true);

    expect(onEntered).toHaveBeenCalledTimes(1);
  });

  it('does not close when a dismissal animation is interrupted', async () => {
    const onClose = jest.fn();
    const spring = jest.spyOn(Reanimated, 'withSpring');
    await render(<AppSheet onClose={onClose} visible><Text>筛选选项</Text></AppSheet>);
    spring.mockImplementationOnce(
      (_target, _config, callback) => { callback?.(false); return 120; },
    );
    mockPanCallbacks.onStart?.({ translationY: 15 });
    mockPanCallbacks.onUpdate?.({ translationY: 400 });
    mockPanCallbacks.onEnd?.({ translationY: 400, velocityY: 2_000 }, true);
    expect(onClose).not.toHaveBeenCalled();

    mockPanCallbacks.onStart?.({ translationY: -15 });
    mockPanCallbacks.onEnd?.({ translationY: -15, velocityY: -1_000 }, true);
    expect(spring).toHaveBeenLastCalledWith(
      0, expect.objectContaining({ velocity: -1_000 }), expect.any(Function),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores a queued dismissal completion after the user grabs the sheet again', async () => {
    const onClose = jest.fn();
    const spring = jest.spyOn(Reanimated, 'withSpring');
    await render(<AppSheet onClose={onClose} visible><Text>筛选选项</Text></AppSheet>);
    let oldDismiss: ((finished?: boolean) => void) | undefined;
    spring.mockImplementationOnce((_target, _config, callback) => {
      oldDismiss = callback;
      return 120;
    });
    mockPanCallbacks.onStart?.({ translationY: 15 });
    mockPanCallbacks.onUpdate?.({ translationY: 400 });
    mockPanCallbacks.onEnd?.({ translationY: 400, velocityY: 2000 }, true);
    mockPanCallbacks.onStart?.({ translationY: -15 });
    mockPanCallbacks.onEnd?.({ translationY: -15, velocityY: -1000 }, true);

    await act(() => oldDismiss?.(true));

    expect(onClose).not.toHaveBeenCalled();
    expect(sharedValues[0].value).toBe(0);
  });

  it('does not let a cancelled drag override the parent closing animation', async () => {
    const spring = jest.spyOn(Reanimated, 'withSpring');
    const content = (visible: boolean) => (
      <AppSheet onClose={jest.fn()} visible={visible}><Text>筛选选项</Text></AppSheet>
    );
    const screen = await render(content(true));
    mockPanCallbacks.onStart?.({ translationY: 15 });
    mockPanCallbacks.onUpdate?.({ translationY: 80 });
    let close: ((finished?: boolean) => void) | undefined;
    spring.mockImplementationOnce((_target, _config, callback) => {
      close = callback;
      return 180;
    });
    await screen.rerender(content(false));

    mockPanCallbacks.onUpdate?.({ translationY: 90 });
    mockPanCallbacks.onEnd?.({ translationY: 90, velocityY: 0 }, false);

    expect(sharedValues[0].value).toBe(180);
    await act(() => close?.(true));
    expect(screen.queryByText('筛选选项')).toBeNull();
  });
});
