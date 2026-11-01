import { act, fireEvent, render } from '@testing-library/react-native';
import { useRef } from 'react';
import { Alert } from 'react-native';
import { requestPermissionsAsync } from 'expo-media-library';
import * as Reanimated from 'react-native-reanimated';

import { FullscreenImageViewer } from '@/features/shared/fullscreen-image-viewer';
import { saveImageToLibrary } from '@/features/shared/saved-image-files';
import { useReduceMotion } from '@/lib/use-reduce-motion';

type GestureState = {
  config: Record<string, unknown>;
  callbacks: Record<string, (event: Record<string, number>, success?: boolean) => void>;
};
const mockGestures = {} as Record<'pinch' | 'pan' | 'tap', GestureState>;
const mockImageMounted = jest.fn();

jest.mock('@/lib/use-reduce-motion', () => ({
  useReduceMotion: jest.fn(() => false),
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 400, height: 800, scale: 1, fontScale: 1 }),
}));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('@/features/shared/saved-image-files', () => ({ saveImageToLibrary: jest.fn() }));
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
    Image: React.forwardRef((props: object, ref: unknown) => {
      React.useLayoutEffect(() => { mockImageMounted(props); }, []);
      return React.createElement(View, { ...props, ref, testID: 'preview-image' });
    }),
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
  jest.mocked(requestPermissionsAsync).mockReset();
  jest.mocked(saveImageToLibrary).mockReset().mockResolvedValue(undefined);
  mockImageMounted.mockReset();
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

it.each([false, true])('keeps an image open when a long drag reverses upward (reduced motion: %s)', async (reduced) => {
  jest.mocked(useReduceMotion).mockReturnValue(reduced);
  const onClose = jest.fn();
  await showImage(onClose);
  mockGestures.pan.callbacks.onStart({ translationX: 0, translationY: 12 });
  mockGestures.pan.callbacks.onUpdate({ translationX: 0, translationY: 400 });
  mockGestures.pan.callbacks.onUpdate({ translationX: 0, translationY: 212 });
  mockGestures.pan.callbacks.onEnd({ translationY: 212, velocityY: -1000 }, true);

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

it('keeps loading and failed images closable, then retries without accepting the failed attempt', async () => {
  const onClose = jest.fn();
  const screen = await render(<FullscreenImageViewer onClose={onClose} title="封面" url="image.jpg" visible />);
  expect(screen.getByLabelText('图片加载中')).toBeTruthy();
  expect(mockGestures.pinch.config.enabled).toBe(false);
  await fireEvent.press(screen.getByLabelText('关闭图片预览'));
  const failedImage = screen.getByTestId('preview-image');
  const failedLoad = failedImage.props.onLoad;
  const failedError = failedImage.props.onError;
  await fireEvent(failedImage, 'error');
  expect(screen.getByText('图片加载失败')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('关闭图片预览'));
  expect(onClose).toHaveBeenCalledTimes(2);

  await fireEvent.press(screen.getByLabelText('重试加载图片'));
  await act(async () => {
    failedLoad({ source: { width: 999, height: 100 } });
    failedError();
  });
  expect(screen.getByLabelText('图片加载中')).toBeTruthy();
  expect(screen.queryByText('图片加载失败')).toBeNull();
  const nextImage = screen.getByTestId('preview-image');
  await fireEvent(nextImage.parent!, 'layout', { nativeEvent: { layout: { width: 400, height: 600 } } });
  await fireEvent(nextImage, 'load', { source: { width: 800, height: 1200 } });
  expect(screen.queryByLabelText('图片加载中')).toBeNull();
  expect(mockGestures.pinch.config.enabled).toBe(true);
});

it('resets image geometry on URL changes and ignores old callbacks before passive effects', async () => {
  const screen = await showImage();
  const oldImage = screen.getByTestId('preview-image');
  const oldLoad = oldImage.props.onLoad;
  const oldError = oldImage.props.onError;
  mockGestures.tap.callbacks.onStart({ x: 100, y: 300 });
  expect(imageTransform()[2].scale).toBe(2.5);
  // Native events may arrive as soon as the replacement image mounts.
  mockImageMounted.mockImplementation((props) => {
    props.onLoad({ source: { width: 600, height: 600 } });
    oldLoad({ source: { width: 9999, height: 10 } });
    oldError();
  });

  await screen.rerender(<FullscreenImageViewer onClose={jest.fn()} title="新图" url="next.jpg" visible />);
  expect(imageTransform()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]);
  expect(screen.queryByLabelText('图片加载中')).toBeNull();
  expect(screen.queryByText('图片加载失败')).toBeNull();
  expect(screen.getByTestId('preview-image').props.style).toEqual(expect.arrayContaining([
    { width: 400, height: 400 },
  ]));
  expect(mockGestures.pinch.config.enabled).toBe(true);
});

it('starts a fresh attempt when the same URL reopens, even if closed-image callbacks arrive late', async () => {
  const onClose = jest.fn();
  const screen = await render(<FullscreenImageViewer onClose={onClose} title="图片" url="image.jpg" visible />);
  const oldImage = screen.getByTestId('preview-image');
  const oldLoad = oldImage.props.onLoad;
  const oldError = oldImage.props.onError;
  await screen.rerender(<FullscreenImageViewer onClose={onClose} title="图片" url="image.jpg" visible={false} />);
  await act(async () => { oldLoad({ source: { width: 600, height: 100 } }); });
  await screen.rerender(<FullscreenImageViewer onClose={onClose} title="图片" url="image.jpg" visible />);
  await act(async () => { oldError(); });
  expect(screen.getByLabelText('图片加载中')).toBeTruthy();
  expect(screen.queryByText('图片加载失败')).toBeNull();
  expect(mockGestures.pinch.config.enabled).toBe(false);
  await fireEvent(screen.getByTestId('preview-image'), 'error');
  expect(screen.getByText('图片加载失败')).toBeTruthy();
});

it('saves the originally selected URL once while the viewer changes and closes', async () => {
  let allowPermission!: () => void;
  const permission = new Promise<void>(resolve => { allowPermission = resolve; });
  jest.mocked(requestPermissionsAsync).mockImplementation(async () => {
    await permission;
    return { granted: true } as Awaited<ReturnType<typeof requestPermissionsAsync>>;
  });
  let finishSaving!: () => void;
  jest.mocked(saveImageToLibrary).mockReturnValue(new Promise<void>(resolve => { finishSaving = resolve; }));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const onClose = jest.fn();
  const screen = await showImage(onClose);
  const download = screen.getByLabelText('下载图片');
  // Two already-queued presses can run before React commits the disabled state.
  await act(async () => {
    await Promise.all([fireEvent.press(download), fireEvent.press(download)]);
  });
  expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
  await screen.rerender(<FullscreenImageViewer onClose={onClose} title="新图" url="next.jpg" visible />);
  await act(async () => { allowPermission(); });
  expect(saveImageToLibrary).toHaveBeenCalledTimes(1);
  expect(saveImageToLibrary).toHaveBeenCalledWith('image.jpg');
  await screen.rerender(<FullscreenImageViewer onClose={onClose} title="新图" url="next.jpg" visible={false} />);
  await act(async () => { finishSaving(); });
  expect(alert).toHaveBeenCalledWith('已保存', '图片已保存到系统相册。');
});

it('shows an unavailable image without a permanent spinner and keeps the close action', async () => {
  const onClose = jest.fn();
  const screen = await render(<FullscreenImageViewer onClose={onClose} title="图片" visible />);
  expect(screen.getByText('暂无可用图片')).toBeTruthy();
  expect(screen.queryByLabelText('图片加载中')).toBeNull();
  expect(screen.queryByLabelText('重试加载图片')).toBeNull();
  await fireEvent.press(screen.getByLabelText('关闭图片预览'));
  expect(onClose).toHaveBeenCalledTimes(1);
});
