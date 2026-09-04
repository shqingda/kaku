import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PressableScale } from '@/features/shared/pressable-scale';

describe('PressableScale', () => {
  it('renders children and fires onPress', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <PressableScale accessibilityRole="button" onPress={onPress}>
        <Text>封面卡片</Text>
      </PressableScale>,
    );

    await fireEvent.press(screen.getByText('封面卡片'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps forwarding onPressIn and onPressOut to callers', async () => {
    // 列表行的 press-in 预取依赖这条转发契约（曾因换用动画组件而回归）。
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    const screen = await render(
      <PressableScale onPressIn={onPressIn} onPressOut={onPressOut}>
        <Text>封面卡片</Text>
      </PressableScale>,
    );
    const target = screen.getByText('封面卡片');

    await fireEvent(target, 'pressIn');
    await fireEvent(target, 'pressOut');

    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onPressOut).toHaveBeenCalledTimes(1);
  });
});
