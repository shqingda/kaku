import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/design';
import { getCollectionStatusLabel, supportsWatchProgress } from '@/features/catalog/subject-types';
import type { PublicUserCollection } from '@/features/users/model';

export function HomeMediaSection({
  error,
  items,
  loading,
  onRetry,
  subjectType,
  title,
  total,
  username,
}: {
  error: boolean;
  items: PublicUserCollection[];
  loading: boolean;
  onRetry: () => void;
  subjectType: number;
  title: string;
  total: number;
  username: string;
}) {
  function openAll() {
    router.push({
      pathname: '/user/collections/[username]',
      params: {
        status: 'doing',
        type: String(subjectType),
        username,
      },
    });
  }

  if (!loading && !error && items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{title}</Text>
          {!loading && !error && total > 0 ? (
            <Text style={styles.count}>{total}</Text>
          ) : null}
        </View>
        {total > 0 ? (
          <Pressable
            accessibilityLabel={`查看全部${title}`}
            accessibilityRole="button"
            hitSlop={6}
            onPress={openAll}
            style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          >
            <Text style={styles.moreText}>全部</Text>
            <SymbolView
              name={{
                android: 'chevron_right',
                ios: 'chevron.right',
                web: 'chevron_right',
              }}
              size={12}
              tintColor={COLORS.muted}
              weight="semibold"
            />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={COLORS.accent} size="small" />
          <Text style={styles.stateText}>正在读取</Text>
        </View>
      ) : error ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.state, pressed && styles.pressed]}
        >
          <Text style={styles.errorText}>暂时没有加载出来，点此重试</Text>
        </Pressable>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {items.map((item) => (
            <MediaCard item={item} key={item.id} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function MediaCard({ item }: { item: PublicUserCollection }) {
  const progress =
    supportsWatchProgress(item.subjectType) && item.totalEpisodes > 0
      ? `${item.progress}/${item.totalEpisodes} 集`
      : getCollectionStatusLabel(item.subjectType, 'doing');

  return (
    <Pressable
      accessibilityLabel={`打开${item.title}`}
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/subject/[id]',
          params: { id: String(item.id) },
        })
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cover}>
        <Text style={styles.coverFallback}>{item.title.slice(0, 1)}</Text>
        {item.coverUrl ? (
          <Image
            contentFit="cover"
            source={item.coverUrl}
            style={StyleSheet.absoluteFill}
            transition={120}
          />
        ) : null}
      </View>
      <Text numberOfLines={2} style={styles.cardTitle}>
        {item.title}
      </Text>
      <Text numberOfLines={1} style={styles.cardMeta}>
        {progress}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 28 },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 4,
  },
  headingCopy: { alignItems: 'baseline', flexDirection: 'row', gap: 8 },
  title: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  count: { color: COLORS.subtle, fontSize: 12, fontWeight: '700' },
  more: { alignItems: 'center', flexDirection: 'row', gap: 3, minHeight: 44 },
  moreText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  list: { gap: 13, paddingRight: 4, paddingTop: 10 },
  card: { width: 104 },
  cover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 14,
    height: 146,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 104,
  },
  coverFallback: { color: COLORS.subtle, fontSize: 16, fontWeight: '700' },
  cardTitle: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 9,
  },
  cardMeta: { color: COLORS.muted, fontSize: 11, marginTop: 5 },
  state: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 76,
    paddingHorizontal: 18,
  },
  stateText: { color: COLORS.muted, fontSize: 13 },
  errorText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.62 },
});
