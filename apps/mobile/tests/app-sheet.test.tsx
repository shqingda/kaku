import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppSheet } from '@/features/shared/app-sheet';
import { useReduceMotion } from '@/lib/use-reduce-motion';

const mockPanCallbacks: {
  onBegin?: () => void;
  onEnd?: (event: { translationY: number; velocityY: number }) => void;
  onUpdate?: (event: { translationY: number }) => void;
} = {};

jest.mock('@/lib/use-reduce-motion', () => ({
  useReduceMotion: jest.fn(() => false),
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  let pan: Record<string, jest.Mock>;
  pan = {
    enabled: jest.fn(() => pan),
    onBegin: jest.fn((callback: () => void) => {
      mockPanCallbacks.onBegin = callback;
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
  beforeEach(() => {
    mockUseReduceMotion.mockReturnValue(false);
    delete mockPanCallbacks.onBegin;
    delete mockPanCallbacks.onEnd;
    delete mockPanCallbacks.onUpdate;
  });

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

  it('closes after a downward fling even when decay needs the spring fallback', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <AppSheet onClose={onClose} visible>
        <Text>筛选选项</Text>
      </AppSheet>,
    );
    const sheet = screen.getByText('筛选选项').parent!;
    fireEvent(sheet, 'layout', { nativeEvent: { layout: { height: 400 } } });

    mockPanCallbacks.onBegin?.();
    mockPanCallbacks.onUpdate?.({ translationY: 50 });
    mockPanCallbacks.onEnd?.({ translationY: 200, velocityY: 2_000 });

    expect(onClose).toHaveBeenCalledTimes(1);
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

    mockPanCallbacks.onUpdate?.({ translationY: 20 });
    mockPanCallbacks.onEnd?.({ translationY: 20, velocityY: 50 });

    expect(onClose).not.toHaveBeenCalled();
  });
});
