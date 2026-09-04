import { fireEvent, render } from '@testing-library/react-native';

import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';

jest.mock('expo-symbols', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { SymbolView: (props: object) => React.createElement(View, props) };
});

jest.mock('@/lib/use-reduce-motion', () => ({
  useReduceMotion: () => true,
}));

describe('ScrollToTopButton', () => {
  it('renders the compact icon variant by default', async () => {
    const screen = await render(
      <ScrollToTopButton onPress={jest.fn()} visible />,
    );

    expect(screen.getByLabelText('回到顶部')).toBeTruthy();
    expect(screen.queryByText('回到顶部')).toBeNull();
  });

  it('renders a visible label in the pill variant', async () => {
    const screen = await render(
      <ScrollToTopButton onPress={jest.fn()} variant="pill" visible />,
    );

    expect(screen.getByText('回到顶部')).toBeTruthy();
  });

  it('forwards presses in either layout', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <ScrollToTopButton onPress={onPress} variant="pill" visible />,
    );

    await fireEvent.press(screen.getByLabelText('回到顶部'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
