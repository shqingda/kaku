import { useCallback, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

// iOS 惯例的行级左滑操作：内容随手势 1:1 平移，操作按钮按进度显现，
// 松手后的回弹/停驻由 ReanimatedSwipeable 的弹簧物理接管（继承手势速度）。
// 点按动作时先收起面板再执行，保持"操作发生在面板上"的空间关系。
// 读屏用户不走滑动手势：各行既有的替代路径（点按已读、编辑按钮）仍然保留。
export type SwipeAction = {
  backgroundColor: string;
  foreground: string;
  id: string;
  label: string;
  onPress: () => void;
  symbol: ComponentProps<typeof SymbolView>['name'];
};

const ACTION_WIDTH = 78;

export function SwipeableRow({
  actions,
  children,
  contentBackgroundColor,
}: {
  actions: SwipeAction[];
  children: ReactNode;
  contentBackgroundColor: string;
}) {
  const renderRightActions = useCallback(
    (
      progress: SharedValue<number>,
      _translation: SharedValue<number>,
      swipeable: SwipeableMethods,
    ) => (
      <View style={styles.panel}>
        {actions.map((action) => (
          <ActionPanel
            action={action}
            key={action.id}
            onCommit={() => {
              swipeable.close();
              action.onPress();
            }}
            progress={progress}
          />
        ))}
      </View>
    ),
    [actions],
  );

  if (actions.length === 0) {
    return <>{children}</>;
  }

  return (
    <ReanimatedSwipeable
      containerStyle={{ backgroundColor: contentBackgroundColor }}
      overshootRight={false}
      renderRightActions={renderRightActions}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

function ActionPanel({
  action,
  onCommit,
  progress,
}: {
  action: SwipeAction;
  onCommit: () => void;
  progress: SharedValue<number>;
}) {
  const revealStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [0, ACTION_WIDTH]),
  }));

  return (
    <Animated.View
      style={[
        styles.action,
        { backgroundColor: action.backgroundColor },
        revealStyle,
      ]}
    >
      <Pressable
        accessibilityLabel={action.label}
        accessibilityRole="button"
        onPress={onCommit}
        style={styles.actionButton}
      >
        <SymbolView
          name={action.symbol}
          size={17}
          tintColor={action.foreground}
          weight="semibold"
        />
        <Text style={[styles.actionLabel, { color: action.foreground }]}>
          {action.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  action: { justifyContent: 'center', overflow: 'hidden' },
  actionButton: {
    alignItems: 'center',
    gap: 3,
    justifyContent: 'center',
    minWidth: ACTION_WIDTH,
  },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  panel: { flexDirection: 'row' },
});
