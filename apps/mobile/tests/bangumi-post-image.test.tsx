import { act, fireEvent, render } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import { BangumiPostImage } from '@/features/shared/bangumi-post-image';
import { FullscreenImageViewer } from '@/features/shared/fullscreen-image-viewer';

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Image: (props: { source: string }) => React.createElement(View, { ...props, testID: props.source }) };
});
jest.mock('@/features/shared/fullscreen-image-viewer', () => ({
  FullscreenImageViewer: jest.fn(() => null),
}));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

function frameStyle(image: TestInstance) {
  return StyleSheet.flatten(image.parent!.parent!.props.style);
}

function viewerProps() {
  return jest.mocked(FullscreenImageViewer).mock.calls.at(-1)![0];
}

it('keeps Android multi-image layout updates opaque and proportions independent', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const screen = await render(<>
    <BangumiPostImage uri="first.gif" />
    <BangumiPostImage uri="second.gif" />
    <BangumiPostImage uri="third.jpg" />
  </>);
  for (const [uri, width, height] of [
    ['first.gif', 640, 360], ['second.gif', 300, 600], ['third.jpg', 800, 800],
  ] as const) {
    await fireEvent(screen.getByTestId(uri), 'load', { source: { width, height } });
  }
  for (const [uri, ratio] of [
    ['first.gif', 640 / 360], ['second.gif', 0.5], ['third.jpg', 1],
  ] as const) {
    const image = screen.getByTestId(uri);
    expect(image.props.transition).toBe(0);
    expect(frameStyle(image).aspectRatio).toBe(ratio);
    expect(image.props.source).toBe(uri);
    expect(image.props.autoplay).not.toBe(false);
  }
});

it('preserves the existing iOS image transition', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const screen = await render(<BangumiPostImage uri="image.jpg" />);
  expect(screen.getByTestId('image.jpg').props.transition).toBe(120);
});

it('locks the first ratio and resets size and preview for a new URL while ignoring the old callbacks', async () => {
  const screen = await render(<BangumiPostImage uri="first.jpg" />);
  const firstImage = screen.getByTestId('first.jpg');
  const oldLoad = firstImage.props.onLoad;
  const oldError = firstImage.props.onError;
  await fireEvent(firstImage, 'load', { source: { width: 640, height: 360 } });
  await fireEvent(screen.getByTestId('first.jpg'), 'load', { source: { width: 639, height: 360 } });
  expect(frameStyle(screen.getByTestId('first.jpg')).aspectRatio).toBe(640 / 360);
  await fireEvent.press(screen.getByLabelText('查看图片'));
  expect(viewerProps()).toMatchObject({ url: 'first.jpg', visible: true });
  await screen.rerender(<BangumiPostImage uri="next.jpg" />);
  await act(async () => {
    oldLoad({ source: { width: 900, height: 10 } });
    oldError();
  });
  expect(frameStyle(screen.getByTestId('next.jpg')).aspectRatio).toBe(1.35);
  expect(screen.getByLabelText('图片加载中')).toBeTruthy();
  expect(screen.queryByText('图片加载失败')).toBeNull();
  expect(viewerProps()).toMatchObject({ url: 'next.jpg', visible: false });
  await fireEvent(screen.getByTestId('next.jpg'), 'load', { source: { width: 300, height: 600 } });
  expect(frameStyle(screen.getByTestId('next.jpg')).aspectRatio).toBe(0.5);
});

it('allows fullscreen while loading or failed and retries without accepting the failed attempt', async () => {
  const screen = await render(<BangumiPostImage uri="image.jpg" />);
  const image = screen.getByTestId('image.jpg');
  const oldLoad = image.props.onLoad;
  const oldError = image.props.onError;
  expect(frameStyle(image).aspectRatio).toBe(1.35);
  expect(screen.getByLabelText('图片加载中')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('查看图片'));
  expect(viewerProps()).toMatchObject({ url: 'image.jpg', visible: true });
  await act(async () => { viewerProps().onClose(); });
  await fireEvent(image, 'error');
  expect(screen.queryByLabelText('图片加载中')).toBeNull();
  expect(screen.getByText('图片加载失败')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '查看大图' }));
  expect(viewerProps()).toMatchObject({ url: 'image.jpg', visible: true });
  await act(async () => { viewerProps().onClose(); });

  await fireEvent.press(screen.getByLabelText('重试加载图片'));
  await act(async () => {
    oldLoad({ source: { width: 900, height: 10 } });
    oldError();
  });
  const retried = screen.getByTestId('image.jpg');
  expect(frameStyle(retried).aspectRatio).toBe(1.35);
  expect(screen.getByLabelText('图片加载中')).toBeTruthy();
  expect(screen.queryByText('图片加载失败')).toBeNull();
  await fireEvent(retried, 'load', { source: { width: 300, height: 600 } });
  expect(screen.queryByLabelText('图片加载中')).toBeNull();
  expect(frameStyle(screen.getByTestId('image.jpg')).aspectRatio).toBe(0.5);
});

it('makes an unusable decoded image retryable instead of leaving an empty loading card', async () => {
  const screen = await render(<BangumiPostImage uri="image.jpg" />);
  await fireEvent(screen.getByTestId('image.jpg'), 'load', { source: { width: 0, height: 600 } });
  expect(screen.queryByLabelText('图片加载中')).toBeNull();
  expect(screen.getByText('图片加载失败')).toBeTruthy();
  expect(screen.getByLabelText('重试加载图片')).toBeTruthy();
});
