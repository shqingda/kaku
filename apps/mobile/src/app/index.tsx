import { useState } from 'react';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import {
  getCollectionStatusLabel,
  SUBJECT_TYPES,
  supportsWatchProgress,
} from '@/features/catalog/subject-types';
import type {
  CollectionStatus,
  WatchingItem,
} from '@/features/watching/model';
import { shouldShowWatchProgress } from '@/features/watching/progress';
import { useWatching } from '@/features/watching/watching-provider';

const COLLECTION_STATUSES: CollectionStatus[] = [
  'doing',
  'wish',
  'completed',
  'onHold',
  'dropped',
];

function Cover({ item, featured = false }: { item: WatchingItem; featured?: boolean }) {
  return (
    <Link.AppleZoom>
      <View style={featured ? styles.featureCover : styles.rowCover}>
        <Text style={styles.coverFallback}>{item.title.slice(0, 1)}</Text>
        <Image
          contentFit="cover"
          source={item.coverUrl}
          style={StyleSheet.absoluteFill}
          transition={180}
        />
      </View>
    </Link.AppleZoom>
  );
}

function Progress({ item }: { item: WatchingItem }) {
  const percentage =
    item.totalEpisodes > 0
      ? Math.round(
          (item.watchedEpisodeNumbers.length / item.totalEpisodes) * 100,
        )
      : 0;

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${percentage}%` }]} />
    </View>
  );
}

export default function HomeScreen() {
  const { items: watchingItems } = useWatching();
  const [selectedType, setSelectedType] = useState(2);
  const [selectedStatus, setSelectedStatus] =
    useState<CollectionStatus>('doing');
  const selectedStatusLabel = getCollectionStatusLabel(
    selectedType,
    selectedStatus,
  );
  const selectedTypeLabel =
    SUBJECT_TYPES.find((type) => type.id === selectedType)?.label ?? '条目';
  const visibleItems = watchingItems.filter(
    (item) =>
      (item.type ?? 2) === selectedType &&
      item.collectionStatus === selectedStatus,
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <FlatList
        contentContainerStyle={styles.content}
        data={visibleItems}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              还没有{selectedStatusLabel}的{selectedTypeLabel}
            </Text>
            <Text style={styles.emptyText}>
              在条目详情选择“{selectedStatusLabel}”后，会显示在这里。
            </Text>
            <Pressable
              accessibilityLabel="前往发现条目"
              accessibilityRole="button"
              onPress={() => router.push('/explore')}
              style={({ pressed }) => [
                styles.emptyAction,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.emptyActionText}>去发现</Text>
            </Pressable>
          </View>
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{selectedStatusLabel}</Text>
                <Text style={styles.subtitle}>
                  {visibleItems.length} 个{selectedTypeLabel}条目
                </Text>
              </View>
              <Link asChild href="/explore">
                <Pressable
                  accessibilityLabel="搜索与每日放送"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.exploreButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={{
                      android: 'search',
                      ios: 'magnifyingglass',
                      web: 'search',
                    }}
                    size={19}
                    tintColor={COLORS.ink}
                    weight="semibold"
                  />
                </Pressable>
              </Link>
            </View>
            <ScrollView
              contentContainerStyle={styles.mediaTabs}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {SUBJECT_TYPES.map((type) => {
                const isSelected = type.id === selectedType;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={type.id}
                    onPress={() => setSelectedType(type.id)}
                    style={[
                      styles.mediaTab,
                      isSelected && styles.selectedMediaTab,
                    ]}
                  >
                    <Text
                      style={[
                        styles.mediaTabText,
                        isSelected && styles.selectedMediaTabText,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <ScrollView
              contentContainerStyle={styles.tabs}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {COLLECTION_STATUSES.map((status) => {
                const isSelected = status === selectedStatus;
                const label = getCollectionStatusLabel(selectedType, status);

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={status}
                    onPress={() => setSelectedStatus(status)}
                    style={[
                      styles.tab,
                      isSelected && styles.selectedTab,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        isSelected && styles.selectedTabText,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        }
        renderItem={({ index, item }) => {
          if (index === 0) {
            return (
              <View style={styles.featureCard}>
                <Link
                  asChild
                  href={{
                    pathname: '/subject/[id]',
                    params: { id: String(item.id) },
                  }}
                >
                  <Pressable
                    accessibilityHint="打开条目详情"
                    accessibilityLabel={`打开${item.title}详情`}
                    accessibilityRole="button"
                    style={styles.featureMain}
                  >
                    <Cover featured item={item} />
                    <View style={styles.featureDetails}>
                      <Text style={styles.sectionLabel}>
                        {selectedStatusLabel}
                      </Text>
                      <Text numberOfLines={2} style={styles.featureTitle}>
                        {item.title}
                      </Text>
                      <ItemProgress item={item} />
                    </View>
                  </Pressable>
                </Link>
              </View>
            );
          }

          return (
            <View>
              {index === 1 ? (
                <Text style={styles.listHeading}>接下来</Text>
              ) : null}
              <View style={styles.row}>
                <Link
                  asChild
                  href={{
                    pathname: '/subject/[id]',
                    params: { id: String(item.id) },
                  }}
                >
                  <Pressable
                    accessibilityHint="打开条目详情"
                    accessibilityLabel={`打开${item.title}详情`}
                    accessibilityRole="button"
                    style={styles.rowMain}
                  >
                    <Cover item={item} />
                    <View style={styles.rowContent}>
                      <Text numberOfLines={1} style={styles.rowTitle}>
                        {item.title}
                      </Text>
                      <ItemProgress item={item} />
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function ItemProgress({ item }: { item: WatchingItem }) {
  if (!supportsWatchProgress(item.type ?? 2)) {
    return (
      <Text style={styles.rowMeta}>
        {item.rating ? `我的评分 ${item.rating} / 10` : '未评分'}
      </Text>
    );
  }

  if (
    !shouldShowWatchProgress({
      collectionStatus: item.collectionStatus,
      totalEpisodes: item.totalEpisodes,
      watchedCount: item.watchedEpisodeNumbers.length,
    })
  ) {
    return item.rating ? (
      <Text style={styles.rowMeta}>我的评分 {item.rating} / 10</Text>
    ) : null;
  }

  return (
    <>
      <Text style={styles.rowMeta}>
        {item.watchedEpisodeNumbers.length} / {item.totalEpisodes} 集
      </Text>
      <Progress item={item} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, paddingBottom: 48, paddingHorizontal: 20 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 26,
    paddingTop: 18,
  },
  mediaTabs: { gap: 8, paddingBottom: 10 },
  mediaTab: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selectedMediaTab: { backgroundColor: COLORS.ink },
  mediaTabText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  selectedMediaTabText: { color: COLORS.surface },
  tabs: { gap: 8, paddingBottom: 18 },
  tab: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  selectedTab: { backgroundColor: COLORS.accentSoft },
  tabText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  selectedTabText: { color: COLORS.accent },
  exploreButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  title: {
    color: COLORS.ink,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.1,
  },
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  featureCard: {
    backgroundColor: '#E9E7E0',
    borderRadius: 28,
    minHeight: 184,
    overflow: 'hidden',
    padding: 14,
  },
  featureMain: { flexDirection: 'row' },
  featureCover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 17,
    height: 156,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 112,
  },
  coverFallback: { color: COLORS.subtle, fontSize: 22, fontWeight: '700' },
  featureDetails: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 17,
    paddingRight: 2,
  },
  sectionLabel: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  featureTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 25,
    marginTop: 6,
  },
  featureMeta: { color: COLORS.muted, fontSize: 13, marginTop: 7 },
  progressTrack: {
    backgroundColor: COLORS.track,
    borderRadius: 99,
    height: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: COLORS.accent,
    borderRadius: 99,
    height: '100%',
  },
  separator: { height: 12 },
  listHeading: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.35,
    marginBottom: 12,
    marginTop: 10,
  },
  row: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    flexDirection: 'row',
    minHeight: 106,
    padding: 11,
  },
  rowMain: { alignItems: 'center', flex: 1, flexDirection: 'row' },
  rowCover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 12,
    height: 84,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 61,
  },
  rowContent: { flex: 1, marginLeft: 14 },
  rowTitle: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  rowMeta: { color: COLORS.muted, fontSize: 13, marginTop: 6 },
  chevron: { color: COLORS.subtle, fontSize: 30, marginLeft: 14, marginRight: 4 },
  emptyState: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 32,
  },
  emptyTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '700' },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyAction: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  emptyActionText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: { opacity: 0.62 },
});
