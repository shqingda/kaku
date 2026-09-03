// 账户页共用的菜单行：图标 + 标题/描述 + 可选角标或加载指示。
import { type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

export function AccountMenuRow({
  colors,
  badge,
  description,
  hasDivider = false,
  icon,
  label,
  loading = false,
  onPress,
}: {
  badge?: number;
  colors: ThemeColors;
  description: string;
  hasDivider?: boolean;
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        hasDivider && styles.menuRowDivider,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.menuIcon}>
        <SymbolView
          name={icon}
          size={18}
          tintColor={colors.accent}
          weight="semibold"
        />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuTitle}>{label}</Text>
        <Text style={styles.menuDescription}>{description}</Text>
      </View>
      {badge ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.accent} size="small" />
      ) : (
        <SymbolView
          name={{
            android: 'chevron_right',
            ios: 'chevron.right',
            web: 'chevron_right',
          }}
          size={14}
          tintColor={colors.subtle}
        />
      )}
    </Pressable>
  );
}

// 两个菜单分组共用的外框样式，跟随组件一起放在这里。
export function createMenuGroupStyles(colors: ThemeColors) {
  return StyleSheet.create({
    menuSectionTitle: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 8,
      marginTop: 22,
      paddingHorizontal: 4,
    },
    menuGroup: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      overflow: 'hidden',
      paddingHorizontal: 18,
    },
  });
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  menuRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 68,
  },
  menuRowDivider: {
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 13,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  menuCopy: { flex: 1, marginLeft: 13 },
  menuTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  menuDescription: { color: colors.subtle, fontSize: 11, marginTop: 3 },
  menuBadge: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    justifyContent: 'center',
    marginRight: 9,
    minHeight: 20,
    minWidth: 20,
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '800',
  },
  pressed: { opacity: 0.62 },
});
