import { act, render } from '@testing-library/react-native';

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
  it('hides the old action before showing the next one', async () => {
    const onTop = jest.fn();
    const onBottom = jest.fn();
    const props = { bottom: 80, onTop, onBottom };
    const screen = await render(
      <EpisodeScrollActionButton {...props} action="top" />,
    );

    expect(screen.getByTestId('scroll-action').props).toMatchObject({
      accessibilityLabel: '回到顶部',
      visible: true,
    });

    await screen.rerender(
      <EpisodeScrollActionButton {...props} action="bottom" />,
    );
    expect(screen.getByTestId('scroll-action').props).toMatchObject({
      accessibilityLabel: '回到顶部',
      visible: false,
    });

    await act(async () => screen.getByTestId('scroll-action').props.onHidden());
    expect(screen.getByTestId('scroll-action').props).toMatchObject({
      accessibilityLabel: '跳到最新回复',
      visible: true,
    });

    await screen.rerender(
      <EpisodeScrollActionButton {...props} action={null} />,
    );
    await act(async () => screen.getByTestId('scroll-action').props.onHidden());
    expect(screen.queryByTestId('scroll-action')).toBeNull();
  });

  it('restores the current button if direction reverses during its exit', async () => {
    const props = { bottom: 80, onTop: jest.fn(), onBottom: jest.fn() };
    const screen = await render(
      <EpisodeScrollActionButton {...props} action="top" />,
    );

    await screen.rerender(
      <EpisodeScrollActionButton {...props} action="bottom" />,
    );
    expect(screen.getByTestId('scroll-action').props.visible).toBe(false);

    await screen.rerender(
      <EpisodeScrollActionButton {...props} action="top" />,
    );
    expect(screen.getByTestId('scroll-action').props).toMatchObject({
      accessibilityLabel: '回到顶部',
      visible: true,
    });
  });
});
