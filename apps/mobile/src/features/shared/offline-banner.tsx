import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { useIsOffline } from '@/lib/use-connectivity';

export function OfflineBanner() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const isOffline = useIsOffline();

  if (!isOffline) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.banner, { paddingTop: insets.top + 8 }]}
    >
      <SymbolView
        name={{ android: 'wifi_off', ios: 'wifi.slash', web: 'wifi_off' }}
        size={14}
        tintColor={colors.surface}
        weight="semibold"
      />
      <Text style={styles.text}>当前离线，显示的是缓存内容</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    left: 0,
    paddingBottom: 9,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  text: { color: colors.surface, fontSize: 13, fontWeight: '600' },
});
