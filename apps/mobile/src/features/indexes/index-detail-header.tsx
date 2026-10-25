import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HIT_SLOP, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import type { PublicIndexDetail } from './model';

export function IndexDetailHeader({
  index,
  collected,
  collectionPending,
  onOpenAuthor,
  onOpenMenu,
  onToggleCollection,
}: {
  index: PublicIndexDetail;
  collected: boolean;
  collectionPending: boolean;
  onOpenAuthor?: () => void;
  onOpenMenu?: () => void;
  onToggleCollection: () => void;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.headerCard}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{index.title}</Text>
        {onOpenMenu ? (
          <Pressable
            accessibilityLabel="更多目录操作"
            accessibilityRole="button"
            hitSlop={HIT_SLOP}
            onPress={onOpenMenu}
            style={({ pressed }) => [
              styles.overflowButton,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{
                android: 'more_horiz',
                ios: 'ellipsis',
                web: 'more_horiz',
              }}
              size={17}
              tintColor={colors.muted}
              weight="semibold"
            />
          </Pressable>
        ) : null}
      </View>
      {onOpenAuthor ? (
        <Pressable
          onPress={onOpenAuthor}
        >
          <Text style={styles.author}>{index.author}</Text>
        </Pressable>
      ) : (
        <Text style={styles.author}>{index.author}</Text>
      )}
      {index.description ? (
        <Text style={styles.description}>{index.description}</Text>
      ) : null}
      <Text style={styles.stats}>
        {index.itemCount} 项 · {index.collects} 收藏 ·{' '}
        {index.replyCount} 回复
      </Text>
      <Pressable
        accessibilityLabel={
          collected ? '取消收藏目录' : '收藏目录'
        }
        accessibilityRole="button"
        accessibilityState={{ busy: collectionPending }}
        disabled={collectionPending}
        onPress={onToggleCollection}
        style={({ pressed }) => [
          styles.collectButton,
          collected && styles.collectedButton,
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={
            collected
              ? { android: 'star', ios: 'star.fill', web: 'star' }
              : { android: 'star_outline', ios: 'star', web: 'star_outline' }
          }
          size={14}
          tintColor={
            collected ? colors.surface : colors.accent
          }
          weight="semibold"
        />
        <Text
          style={[
            styles.collectText,
            collected && styles.collectedText,
          ]}
        >
          {collected ? '已收藏' : '收藏目录'}
        </Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: SPACING.xl,
  },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row' },
  overflowButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginLeft: SPACING.sm,
    width: 32,
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: TYPE.titleLarge.fontSize,
    fontWeight: '800',
    letterSpacing: TYPE.titleLarge.letterSpacing,
    lineHeight: TYPE.titleLarge.lineHeight,
  },
  author: {
    color: colors.accent,
    fontSize: TYPE.caption.fontSize,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  description: {
    color: colors.muted,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    marginTop: SPACING.lg,
  },
  stats: { color: colors.subtle, fontSize: TYPE.caption.fontSize, marginTop: SPACING.lg },
  collectButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: 15,
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    marginTop: SPACING.lg,
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
  },
  collectedButton: { backgroundColor: colors.accent },
  collectText: { color: colors.accent, fontSize: TYPE.caption.fontSize, fontWeight: '800' },
  collectedText: { color: colors.surface },
  pressed: { opacity: 0.62 },
});
