import { render } from '@testing-library/react-native';

import { EpisodeScrollActionButton } from '@/features/discussions/episode-scroll-action-button';

jest.mock('@/features/shared/scroll-to-top-button', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ScrollToTopButton: (props: object) =>
      React.createElement(View, { ...props, testID: 'scroll-action' }),
  };
});

describe('EpisodeScrollActionButton', () => {
  it('keeps the button visible while its direction changes', async () => {
    const onTop = jest.fn();
    const onBottom = jest.fn();
    const props = { bottom: 80, onTop, onBottom };
    const screen = await render(
      <EpisodeScrollActionButton {...props} action="top" />,
    );

    expect(screen.getByTestId('scroll-action').props).toMatchObject({
      accessibilityLabel: '回到顶部',
      visible: true,
      onPress: onTop,
    });

    await screen.rerender(
      <EpisodeScrollActionButton {...props} action="bottom" />,
    );
    expect(screen.getByTestId('scroll-action').props).toMatchObject({
      accessibilityLabel: '跳到最新回复',
      visible: true,
      onPress: onBottom,
    });

    await screen.rerender(
      <EpisodeScrollActionButton {...props} action={null} />,
    );
    expect(screen.getByTestId('scroll-action').props.visible).toBe(false);
  });

  it('can reverse direction without hiding the button', async () => {
    const props = { bottom: 80, onTop: jest.fn(), onBottom: jest.fn() };
    const screen = await render(
      <EpisodeScrollActionButton {...props} action="top" />,
    );

    await screen.rerender(
      <EpisodeScrollActionButton {...props} action="bottom" />,
    );
    await screen.rerender(
      <EpisodeScrollActionButton {...props} action="top" />,
    );
    expect(screen.getByTestId('scroll-action').props).toMatchObject({
      accessibilityLabel: '回到顶部',
      visible: true,
      onPress: props.onTop,
    });
  });
});
