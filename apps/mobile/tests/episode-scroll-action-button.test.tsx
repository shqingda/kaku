import { fireEvent, render } from '@testing-library/react-native';

import { EpisodeScrollActionButton } from '@/features/discussions/episode-scroll-action-button';

jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('@/lib/use-reduce-motion', () => ({ useReduceMotion: () => true }));

describe('EpisodeScrollActionButton', () => {
  it('switches the accessible action in both directions and ignores presses while hidden', async () => {
    const onTop = jest.fn();
    const onBottom = jest.fn();
    const props = { bottom: 80, onTop, onBottom };
    const screen = await render(
      <EpisodeScrollActionButton {...props} action="top" />,
    );

    await fireEvent.press(screen.getByRole('button', { name: '回到顶部' }));
    expect(onTop).toHaveBeenCalledTimes(1);
    expect(onBottom).not.toHaveBeenCalled();

    await screen.rerender(
      <EpisodeScrollActionButton {...props} action="bottom" />,
    );
    expect(screen.queryByRole('button', { name: '回到顶部' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '跳到最新回复' }));
    expect(onTop).toHaveBeenCalledTimes(1);
    expect(onBottom).toHaveBeenCalledTimes(1);

    await screen.rerender(
      <EpisodeScrollActionButton {...props} action="top" />,
    );
    expect(screen.queryByRole('button', { name: '跳到最新回复' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '回到顶部' }));
    expect(onTop).toHaveBeenCalledTimes(2);
    expect(onBottom).toHaveBeenCalledTimes(1);

    await screen.rerender(
      <EpisodeScrollActionButton {...props} action={null} />,
    );
    await fireEvent.press(screen.getByRole('button', {
      name: '跳到最新回复', includeHiddenElements: true,
    }));
    expect(onTop).toHaveBeenCalledTimes(2);
    expect(onBottom).toHaveBeenCalledTimes(1);
  });
});
