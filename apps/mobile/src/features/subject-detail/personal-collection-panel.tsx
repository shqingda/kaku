import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import type { PersonalCollectionUpdate } from '@/features/collections/model';
import { useTheme } from '@/features/theme/theme-provider';
import type { WatchingItem } from '@/features/watching/model';
import { userErrorMessage } from '@/lib/user-error-message';

import { CollectionControls } from './collection-controls';

// 登录用户的收藏盒先显示同步状态；失败时说明原因并可重试，不用空白占位。
export function PersonalCollectionPanel({
  error,
  isError,
  isPending,
  item,
  onRetry,
  onSave,
  signedIn,
}: {
  error: unknown;
  isError: boolean;
  isPending: boolean;
  item: WatchingItem;
  onRetry: () => void;
  onSave: (update: PersonalCollectionUpdate) => Promise<void>;
  signedIn: boolean;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  if (signedIn && isPending) {
    return (
      <View style={styles.state}>
        <Text style={styles.title}>正在读取收藏盒</Text>
        <Text style={styles.text}>正在同步 Bangumi 收藏、进度和评分。</Text>
      </View>
    );
  }

  if (signedIn && isError) {
    return (
      <View style={styles.state}>
        <Text style={styles.title}>收藏盒同步失败</Text>
        <Text style={styles.text}>{userErrorMessage(error)}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      </View>
    );
  }

  return <CollectionControls item={item} onSave={onSave} />;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  state: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: SPACING.lg,
    padding: SPACING.lg + SPACING.xs,
  },
  title: { color: colors.ink, ...TYPE.heading, fontWeight: '800' },
  text: {
    color: colors.muted,
    ...TYPE.caption,
    lineHeight: TYPE.body.lineHeight,
    marginTop: SPACING.sm,
  },
  retry: {
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  retryText: { color: colors.accent, ...TYPE.caption, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
