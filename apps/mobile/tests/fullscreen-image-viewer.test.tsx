import { fireEvent, render } from '@testing-library/react-native';
import { useRef } from 'react';
import * as Reanimated from 'react-native-reanimated';

import { FullscreenImageViewer } from '@/features/shared/fullscreen-image-viewer';
import { useReduceMotion } from '@/lib/use-reduce-motion';

type GestureState = {
  config: Record<string, unknown>;
  callbacks: Record<string, (event: Record<string, number>, success?: boolean) => void>;
};
const mockGestures = {} as Record<'pinch' | 'pan' | 'tap', GestureState>;

jest.mock('@/lib/use-reduce-motion', () => ({
  useReduceMotion: jest.fn(() => false),
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 400, height: 800, scale: 1, fontScale: 1 }),
}));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('expo-media-library', () => ({
  Asset: { create: jest.fn() },
  requestPermissionsAsync: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: React.forwardRef((props: object, ref: unknown) =>
      React.createElement(View, { ...props, ref, testID: 'preview-image' })),
  };
});
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  function gesture(kind: 'pinch' | 'pan' | 'tap') {
    const state: GestureState = { config: { enabled: true }, callbacks: {} };
    mockGestures[kind] = state;
    const builder: Record<string, jest.Mock> = {};
    for (const option of ['enabled', 'minDistance', 'activeOffsetY', 'failOffsetX', 'numberOfTaps']) {
      builder[option] = jest.fn((value: unknown) => {
        state.config[option] = value;
        return builder;
      });
    }
    for (const event of ['onStart', 'onUpdate', 'onEnd']) {
      builder[event] = jest.fn((callback: GestureState['callbacks'][string]) => {
        state.callbacks[event] = callback;
        return builder;
      });
    }
    return builder;
  }

  return {
    Gesture: {
      Pinch: () => gesture('pinch'),
      Pan: () => gesture('pan'),
      Tap: () => gesture('tap'),
      Simultaneous: (...gestures: unknown[]) => gestures,
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

const styleUpdaters: Array<Parameters<typeof Reanimated.useAnimatedStyle>[0]> = [];

function imageTransform() {
  return styleUpdaters.at(-1)!().transform as [
    { translateX: number }, { translateY: number }, { scale: number },
  ];
}

async function showImage(onClose = jest.fn()) {
  const screen = await render(
    <FullscreenImageViewer onClose={onClose} title="封面" url="image.jpg" visible />,
  );
  const image = screen.getByTestId('preview-image');
  await fireEvent(image.parent!, 'layout', {
    nativeEvent: { layout: { width: 400, height: 600 } },
  });
  await fireEvent(image, 'load', { source: { width: 800, height: 1200 } });
  return screen;
}

beforeEach(() => {
  jest.mocked(useReduceMotion).mockReturnValue(false);
  styleUpdaters.length = 0;
  jest.spyOn(Reanimated, 'useSharedValue').mockImplementation(<T,>(initial: T) =>
    useRef({ value: initial } as Reanimated.SharedValue<T>).current);
  jest.spyOn(Reanimated, 'useAnimatedStyle').mockImplementation((updater) => {
    styleUpdaters.push(updater);
    // The test renderer reads plain styles; the native hook returns an animation handle.
    return updater() as unknown as ReturnType<typeof Reanimated.useAnimatedStyle>;
  });
});

afterEach(() => jest.restoreAllMocks());

it('allows a purely horizontal drag to move a zoomed image', async () => {
  await showImage();
  mockGestures.tap.callbacks.onStart({ x: 200, y: 400 });

  expect(mockGestures.pan.config.minDistance).toBe(12);
  expect(mockGestures.pan.config.activeOffsetY).toBeUndefined();
  expect(mockGestures.pan.config.failOffsetX).toBeUndefined();
  mockGestures.pan.callbacks.onStart({ translationX: 12, translationY: 0 });
  mockGestures.pan.callbacks.onUpdate({ translationX: 92, translationY: 0 });

  expect(imageTransform()[0].translateX).toBe(80);
  expect(imageTransform()[1].translateY).toBe(0);
  expect(imageTransform()[2].scale).toBe(2.5);
});

it('keeps pinch, double tap, and panning available with reduced motion', async () => {
  jest.mocked(useReduceMotion).mockReturnValue(true);
  const spring = jest.spyOn(Reanimated, 'withSpring');
  await showImage();
  spring.mockClear();

  expect(mockGestures.pinch.config.enabled).toBe(true);
  expect(mockGestures.pan.config.enabled).toBe(true);
  expect(mockGestures.tap.config.enabled).toBe(true);
  mockGestures.pinch.callbacks.onStart({});
  mockGestures.pinch.callbacks.onUpdate({ focalX: 200, focalY: 400, scale: 2 });
  expect(imageTransform()[2].scale).toBe(2);
  mockGestures.pinch.callbacks.onEnd({}, true);
  mockGestures.tap.callbacks.onStart({ x: 200, y: 400 });
  expect(imageTransform()[2].scale).toBe(1);
  mockGestures.tap.callbacks.onStart({ x: 200, y: 400 });
  expect(imageTransform()[2].scale).toBe(2.5);
  mockGestures.pan.callbacks.onStart({ translationX: 12, translationY: 0 });
  mockGestures.pan.callbacks.onUpdate({ translationX: 72, translationY: 0 });
  expect(imageTransform()[0].translateX).toBe(60);
  expect(spring).not.toHaveBeenCalled();
});

it.each([false, true])('returns a cancelled downward drag without closing (reduced motion: %s)', async (reduced) => {
  jest.mocked(useReduceMotion).mockReturnValue(reduced);
  const onClose = jest.fn();
  await showImage(onClose);
  mockGestures.pan.callbacks.onStart({ translationX: 0, translationY: 12 });
  mockGestures.pan.callbacks.onUpdate({ translationX: 0, translationY: 400 });
  expect(imageTransform()[1].translateY).toBeGreaterThan(0);

  mockGestures.pan.callbacks.onEnd({ translationY: 400, velocityY: 2000 }, false);

  expect(onClose).not.toHaveBeenCalled();
  expect(imageTransform()[1].translateY).toBe(0);
});

it('continues an interrupted return and uses its displayed displacement on release', async () => {
  const onClose = jest.fn();
  const cancel = jest.spyOn(Reanimated, 'cancelAnimation');
  const spring = jest.spyOn(Reanimated, 'withSpring');
  await showImage(onClose);
  spring.mockImplementationOnce(() => 80);
  mockGestures.pan.callbacks.onStart({ translationX: 0, translationY: 12 });
  mockGestures.pan.callbacks.onUpdate({ translationX: 0, translationY: 40 });
  mockGestures.pan.callbacks.onEnd({ translationY: 40, velocityY: 0 }, true);
  expect(imageTransform()[1].translateY).toBe(80);

  mockGestures.pan.callbacks.onStart({ translationX: 0, translationY: 12 });
  mockGestures.pan.callbacks.onUpdate({ translationX: 0, translationY: 12 });

  expect(cancel).toHaveBeenCalled();
  expect(imageTransform()[1].translateY).toBeCloseTo(80);
  mockGestures.pan.callbacks.onEnd({ translationY: 12, velocityY: 0 }, true);
  expect(onClose).toHaveBeenCalledTimes(1);
});

it.each([
  { scale: 0.9, target: 1, pinch: 0.5, x: 0, y: 0 },
  { scale: 4.1, target: 4, pinch: 5, x: 600, y: 900 },
])('settles an interrupted pinch rebound at $scale and keeps the image contained', async (value) => {
  const onClose = jest.fn();
  const spring = jest.spyOn(Reanimated, 'withSpring');
  await showImage(onClose);
  mockGestures.pinch.callbacks.onStart({});
  mockGestures.pinch.callbacks.onUpdate({ focalX: 200, focalY: 400, scale: value.pinch });
  spring.mockImplementationOnce(() => value.scale);
  mockGestures.pinch.callbacks.onEnd({}, true);
  expect(imageTransform()[2].scale).toBe(value.scale);

  mockGestures.pan.callbacks.onStart({ translationX: 12, translationY: 0 });
  const translationY = value.target > 1 ? 10000 : 0;
  mockGestures.pan.callbacks.onUpdate({ translationX: 10000, translationY });
  mockGestures.pan.callbacks.onEnd({ translationY, velocityY: 0 }, true);

  expect(imageTransform()[2].scale).toBe(value.target);
  expect(imageTransform()[0].translateX).toBe(value.x);
  expect(imageTransform()[1].translateY).toBe(value.y);
  expect(onClose).not.toHaveBeenCalled();
});

it.each([false, true])('still closes after a successful downward fling (reduced motion: %s)', async (reduced) => {
  jest.mocked(useReduceMotion).mockReturnValue(reduced);
  const onClose = jest.fn();
  await showImage(onClose);
  mockGestures.pan.callbacks.onStart({ translationX: 0, translationY: 12 });
  mockGestures.pan.callbacks.onUpdate({ translationX: 0, translationY: 400 });
  mockGestures.pan.callbacks.onEnd({ translationY: 400, velocityY: 2000 }, true);

  expect(onClose).toHaveBeenCalledTimes(1);
});
