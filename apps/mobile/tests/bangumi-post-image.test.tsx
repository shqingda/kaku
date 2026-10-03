import { fireEvent, render } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import { BangumiPostImage } from '@/features/shared/bangumi-post-image';

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Image: (props: { source: string }) => React.createElement(View, { ...props, testID: props.source }) };
});
jest.mock('@/features/shared/fullscreen-image-viewer', () => ({
  FullscreenImageViewer: () => null,
}));

afterEach(() => jest.restoreAllMocks());

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
    expect(StyleSheet.flatten(image.props.style).aspectRatio).toBe(ratio);
    expect(image.props.source).toBe(uri);
    expect(image.props.autoplay).not.toBe(false);
  }
});

it('preserves the existing iOS image transition', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const screen = await render(<BangumiPostImage uri="image.jpg" />);
  expect(screen.getByTestId('image.jpg').props.transition).toBe(120);
});

it('holds the first ratio through resized decode events and resets it for a different image', async () => {
  const screen = await render(<BangumiPostImage uri="first.jpg" />);
  await fireEvent(screen.getByTestId('first.jpg'), 'load', { source: { width: 640, height: 360 } });
  await fireEvent(screen.getByTestId('first.jpg'), 'load', { source: { width: 639, height: 360 } });
  expect(StyleSheet.flatten(screen.getByTestId('first.jpg').props.style).aspectRatio).toBe(640 / 360);
  await screen.rerender(<BangumiPostImage uri="next.jpg" />);
  expect(StyleSheet.flatten(screen.getByTestId('next.jpg').props.style).aspectRatio).toBe(1.35);
  await fireEvent(screen.getByTestId('next.jpg'), 'load', { source: { width: 300, height: 600 } });
  expect(StyleSheet.flatten(screen.getByTestId('next.jpg').props.style).aspectRatio).toBe(0.5);
});
