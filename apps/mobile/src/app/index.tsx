import { type ComponentProps, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import {
  getCollectionStatusLabel,
  SUBJECT_TYPES,
  supportsWatchProgress,
} from '@/features/catalog/subject-types';
import type { PublicUserCollection } from '@/features/users/model';
import { usePublicUserCollections } from '@/features/users/use-public-user';
import type { CollectionStatus } from '@/features/watching/model';

const COLLECTION_STATUSES: CollectionStatus[] = [
  'doing',
  'wish',
  'completed',
  'onHold',
  'dropped',
];

export default function HomeScreen() {
  const { isLoading: isAuthLoading, session } = useAuth();
  const [selectedType, setSelectedType] = useState(2);
  const [selectedStatus, setSelectedStatus] =
    useState<CollectionStatus>('doing');
  const username = session?.user.username ?? '';
  const collectionsQuery = usePublicUserCollections(
    username,
    selectedType,
    selectedStatus,
  );
  const collections = useMemo(
    () =>
      collectionsQuery.data?.pages.flatMap((page) => page.items).slice(0, 5) ??
      [],
    [collectionsQuery.data],
  );
  const total = collectionsQuery.data?.pages[0]?.total ?? 0;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader session={session} />

        {isAuthLoading ? (
          <HomeState message="正在读取账户信息" />
        ) : session ? (
          <>
            <View style={styles.collectionCard}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>收藏</Text>
                  <Text style={styles.sectionMeta}>
                    {total > 0 ? `${total} 个条目` : '按原版收藏状态整理'}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="查看全部收藏"
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/user/collections/[username]',
                      params: { type: String(selectedType), username },
                    })
                  }
                  style={({ pressed }) => [
                    styles.moreButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.moreText}>查看全部</Text>
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
                contentContainerStyle={styles.statusTabs}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {COLLECTION_STATUSES.map((status) => {
                  const isSelected = status === selectedStatus;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={status}
                      onPress={() => setSelectedStatus(status)}
                      style={styles.statusTab}
                    >
                      <Text
                        style={[
                          styles.statusTabText,
                          isSelected && styles.selectedStatusTabText,
                        ]}
                      >
                        {getCollectionStatusLabel(selectedType, status)}
                      </Text>
                      <View
                        style={[
                          styles.statusIndicator,
                          isSelected && styles.selectedStatusIndicator,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>

              <CollectionContent
                collections={collections}
                isError={collectionsQuery.isError}
                isPending={collectionsQuery.isPending}
                onRetry={() => void collectionsQuery.refetch()}
                selectedStatus={selectedStatus}
                selectedType={selectedType}
              />
            </View>

            <QuickActions />
          </>
        ) : (
          <SignedOutHome />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeHeader({
  session,
}: {
  session: ReturnType<typeof useAuth>['session'];
}) {
  return (
    <View style={styles.headerArea}>
      <View style={styles.header}>
        <Text style={styles.brand}>Kaku</Text>
        <Pressable
          accessibilityLabel={session ? '查看账户' : '登录 Bangumi'}
          accessibilityRole="button"
          onPress={() => router.push('/account')}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}
        >
          {session?.user.avatarUrl ? (
            <Image
              contentFit="cover"
              source={session.user.avatarUrl}
              style={styles.accountAvatar}
            />
          ) : (
            <SymbolView
              name={{
                android: 'account_circle',
                ios: 'person.crop.circle',
                web: 'account_circle',
              }}
              size={25}
              tintColor={COLORS.ink}
              weight="semibold"
            />
          )}
        </Pressable>
      </View>
      <Pressable
        accessibilityLabel="搜索条目、人物和话题"
        accessibilityRole="search"
        onPress={() => router.push('/explore')}
        style={({ pressed }) => [
          styles.searchBox,
          pressed && styles.searchBoxPressed,
        ]}
      >
        <SymbolView
          name={{
            android: 'search',
            ios: 'magnifyingglass',
            web: 'search',
          }}
          size={20}
          tintColor={COLORS.muted}
          weight="medium"
        />
        <Text style={styles.searchPlaceholder}>搜索条目、人物和话题</Text>
      </Pressable>
    </View>
  );
}

function SignedOutHome() {
  return (
    <>
      <View style={styles.signedOutCard}>
        <View style={styles.signedOutMark}>
          <SymbolView
            name={{
              android: 'bookmark',
              ios: 'bookmark.fill',
              web: 'bookmark',
            }}
            size={24}
            tintColor={COLORS.accent}
          />
        </View>
        <Text style={styles.signedOutTitle}>从收藏开始</Text>
        <Text style={styles.signedOutText}>
          登录 Bangumi 后管理动画、书籍、音乐、游戏和三次元收藏。未登录时不会在本机创建另一份记录。
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/account')}
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.loginButtonText}>登录 Bangumi</Text>
        </Pressable>
      </View>
      <QuickActions />
    </>
  );
}

function CollectionContent({
  collections,
  isError,
  isPending,
  onRetry,
  selectedStatus,
  selectedType,
}: {
  collections: PublicUserCollection[];
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
  selectedStatus: CollectionStatus;
  selectedType: number;
}) {
  if (isPending) {
    return <HomeState compact message="正在读取 Bangumi 收藏" />;
  }

  if (isError) {
    return (
      <HomeState
        action={onRetry}
        compact
        message="收藏暂时没有加载出来"
      />
    );
  }

  if (collections.length === 0) {
    return (
      <View style={styles.emptyCollection}>
        <Text style={styles.emptyTitle}>
          还没有{getCollectionStatusLabel(selectedType, selectedStatus)}的条目
        </Text>
        <Text style={styles.emptyText}>去发现感兴趣的内容并加入收藏。</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/explore')}
          style={({ pressed }) => [
            styles.inlineAction,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.inlineActionText}>去发现</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.collectionList}>
      {collections.map((item, index) => (
        <CollectionRow
          hasDivider={index > 0}
          item={item}
          key={item.id}
        />
      ))}
    </View>
  );
}

function CollectionRow({
  hasDivider,
  item,
}: {
  hasDivider: boolean;
  item: PublicUserCollection;
}) {
  const progress =
    supportsWatchProgress(item.subjectType) && item.totalEpisodes > 0
      ? `${item.progress}/${item.totalEpisodes} 集`
      : undefined;
  const meta = [progress, item.rate ? `${item.rate} 分` : undefined]
    .filter(Boolean)
    .join(' · ');

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
      style={({ pressed }) => [
        styles.collectionRow,
        hasDivider && styles.collectionDivider,
        pressed && styles.pressed,
      ]}
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
      <View style={styles.collectionCopy}>
        <Text numberOfLines={2} style={styles.collectionTitle}>
          {item.title}
        </Text>
        <Text style={styles.collectionMeta}>
          {meta ||
            getCollectionStatusLabel(
              item.subjectType,
              item.collectionStatus ?? 'doing',
            )}
        </Text>
      </View>
      <SymbolView
        name={{
          android: 'chevron_right',
          ios: 'chevron.right',
          web: 'chevron_right',
        }}
        size={15}
        tintColor={COLORS.subtle}
        weight="semibold"
      />
    </Pressable>
  );
}

function QuickActions() {
  return (
    <View style={styles.quickSection}>
      <Text style={styles.quickTitle}>发现</Text>
      <View style={styles.quickCard}>
        <QuickActionRow
          href="/explore"
          icon={{
            android: 'calendar_month',
            ios: 'calendar',
            web: 'calendar_month',
          }}
          label="每日放送"
          meta="查看今天和本周播出的动画"
        />
        <QuickActionRow
          hasDivider
          href="/rankings"
          icon={{ android: 'leaderboard', ios: 'chart.bar', web: 'leaderboard' }}
          label="排行榜"
          meta="浏览动画、书籍、音乐、游戏与三次元"
        />
        <QuickActionRow
          hasDivider
          href="/community"
          icon={{
            android: 'forum',
            ios: 'bubble.left.and.bubble.right',
            web: 'forum',
          }}
          label="社区"
          meta="看看公开小组和最新话题"
        />
      </View>
    </View>
  );
}

function QuickActionRow({
  hasDivider = false,
  href,
  icon,
  label,
  meta,
}: {
  hasDivider?: boolean;
  href: '/community' | '/explore' | '/rankings';
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  meta: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => router.push(href)}
      style={({ pressed }) => [
        styles.quickActionRow,
        hasDivider && styles.quickDivider,
        pressed && styles.pressed,
      ]}
    >
        <View style={styles.quickIcon}>
          <SymbolView
            name={icon}
            size={19}
            tintColor={COLORS.accent}
            weight="medium"
          />
        </View>
        <View style={styles.quickCopy}>
          <Text style={styles.quickLabel}>{label}</Text>
          <Text numberOfLines={1} style={styles.quickMeta}>
            {meta}
          </Text>
        </View>
        <SymbolView
          name={{
            android: 'chevron_right',
            ios: 'chevron.right',
            web: 'chevron_right',
          }}
          size={14}
          tintColor={COLORS.subtle}
          weight="semibold"
        />
    </Pressable>
  );
}

function HomeState({
  action,
  compact = false,
  message,
}: {
  action?: () => void;
  compact?: boolean;
  message: string;
}) {
  return (
    <View style={[styles.state, compact && styles.compactState]}>
      {!action ? <ActivityIndicator color={COLORS.accent} /> : null}
      <Text style={styles.stateText}>{message}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  headerArea: { paddingBottom: 22, paddingTop: 10 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  brand: {
    color: COLORS.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  accountAvatar: { borderRadius: 17, height: 34, width: 34 },
  searchBox: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    flexDirection: 'row',
    gap: 10,
    height: 50,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  searchBoxPressed: { backgroundColor: '#F0EFEB' },
  searchPlaceholder: { color: COLORS.muted, fontSize: 15 },
  collectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    overflow: 'hidden',
    paddingTop: 22,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sectionMeta: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  moreButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minHeight: 44,
    paddingLeft: 12,
  },
  moreText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  mediaTabs: { gap: 7, paddingHorizontal: 20, paddingTop: 20 },
  mediaTab: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    minHeight: 38,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  selectedMediaTab: { backgroundColor: COLORS.ink },
  mediaTabText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  selectedMediaTabText: { color: COLORS.surface },
  statusTabs: {
    borderBottomColor: COLORS.track,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  statusTab: { minHeight: 40, justifyContent: 'space-between' },
  statusTabText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  selectedStatusTabText: { color: COLORS.ink, fontWeight: '800' },
  statusIndicator: { borderRadius: 1, height: 2, marginTop: 10 },
  selectedStatusIndicator: { backgroundColor: COLORS.accent },
  collectionList: { paddingHorizontal: 20 },
  collectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 94,
    paddingVertical: 11,
    width: '100%',
  },
  collectionDivider: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 10,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 51,
  },
  coverFallback: { color: COLORS.subtle, fontSize: 14, fontWeight: '700' },
  collectionCopy: { flex: 1, marginLeft: 13, minWidth: 0 },
  collectionTitle: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  collectionMeta: { color: COLORS.muted, fontSize: 12, marginTop: 6 },
  signedOutCard: {
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 24,
  },
  signedOutMark: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  signedOutTitle: {
    color: COLORS.ink,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 24,
  },
  signedOutText: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
  },
  loginButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    marginTop: 24,
  },
  loginButtonText: { color: COLORS.surface, fontSize: 15, fontWeight: '800' },
  quickSection: { marginTop: 28 },
  quickTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.35,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  quickCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    overflow: 'hidden',
    paddingHorizontal: 18,
  },
  quickActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 82,
    width: '100%',
  },
  quickDivider: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quickIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  quickCopy: { flex: 1, marginLeft: 13, minWidth: 0 },
  quickLabel: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  quickMeta: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  state: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    gap: 10,
    justifyContent: 'center',
    minHeight: 180,
    padding: 24,
  },
  compactState: { borderRadius: 0, minHeight: 142 },
  stateText: { color: COLORS.muted, fontSize: 14, textAlign: 'center' },
  retryButton: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 12,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  retryText: { color: COLORS.accent, fontSize: 13, fontWeight: '800' },
  emptyCollection: { alignItems: 'center', padding: 28 },
  emptyTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '700' },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  inlineAction: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 12,
    marginTop: 15,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  inlineActionText: { color: COLORS.accent, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
