import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { SkeletonBox } from '@/features/shared/skeleton';
import { useTheme } from '@/features/theme/theme-provider';

// 骨架与真实页共用滚动容器和顶部内边距：骨架的位置就是数据到达后的位置，
// 加载完成不位移，AppleZoom 落点保持稳定。尺寸对应封面、年份、标题和前两个面板。
export function SubjectDetailSkeleton() {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.skeleton}>
      <SkeletonBox borderRadius={24} height={238} width={170} />
      <SkeletonBox height={18} width={96} />
      <SkeletonBox height={26} width="62%" />
      <SkeletonBox borderRadius={22} height={132} width="100%" />
      <SkeletonBox borderRadius={22} height={168} width="100%" />
    </View>
  );
}

export function SubjectLoadError({ onRetry }: { onRetry: () => void }) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>条目读取失败</Text>
      <Text style={styles.errorText}>请检查网络后重试。</Text>
      <Pressable
        accessibilityLabel="重新读取条目"
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.errorRetry, pressed && styles.pressed]}
      >
        <Text style={styles.errorRetryText}>重试</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  skeleton: {
    alignItems: 'center',
    gap: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  errorState: { flex: 1, justifyContent: 'center', padding: SPACING.xxl },
  errorTitle: { color: colors.ink, ...TYPE.titleLarge, fontWeight: '700' },
  errorText: { color: colors.muted, ...TYPE.body, lineHeight: TYPE.body.lineHeight, marginTop: SPACING.sm },
  errorRetry: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 13,
    justifyContent: 'center',
    marginTop: SPACING.lg,
    minHeight: 44,
    paddingHorizontal: SPACING.lg + SPACING.xs,
  },
  errorRetryText: { color: colors.surface, ...TYPE.body, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
