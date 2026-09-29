import { type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { AppSheet } from '@/features/shared/app-sheet';
import { useTheme } from '@/features/theme/theme-provider';

export type AppActionMenuItem = {
  id: string;
  label: string;
  onPress: () => void;
  symbol: ComponentProps<typeof SymbolView>['name'];
};

// 按钮触发的操作菜单：底部动作面板（iOS 惯例），替代用 Alert 列操作的
// 做法——44pt+ 行高、带图标、与应用的弹簧体系一致。菜单只负责跳转，
// 危险操作各自保留确认对话框（真正的防线在确认，不在菜单标红）。
export function AppActionMenu({
  actions,
  onClose,
  title,
  visible,
}: {
  actions: AppActionMenuItem[];
  onClose: () => void;
  title?: string;
  visible: boolean;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  return (
    <AppSheet onClose={onClose} visible={visible}>
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
        {title ? (
          <Text style={styles.title}>
            {title}
          </Text>
        ) : null}
        {actions.map((action, index) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            key={action.id}
            onPress={() => {
              onClose();
              action.onPress();
            }}
            style={({ pressed }) => [
              styles.row,
              index > 0 && styles.rowDivider,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={action.symbol}
              size={17}
              tintColor={colors.ink}
              weight="semibold"
            />
            <Text style={styles.rowLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </AppSheet>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flexShrink: 1 },
    title: {
      color: colors.subtle,
      fontSize: TYPE.caption.fontSize,
      fontWeight: '700',
      marginBottom: SPACING.sm,
      textAlign: 'center',
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: SPACING.md,
      minHeight: MIN_TOUCH_SIZE,
      paddingVertical: SPACING.sm,
    },
    rowDivider: {
      borderTopColor: colors.divider,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    rowLabel: {
      flex: 1,
      color: colors.ink,
      fontSize: TYPE.body.fontSize,
      fontWeight: '600',
    },
    pressed: { opacity: 0.62 },
  });
