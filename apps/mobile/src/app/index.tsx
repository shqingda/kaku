import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { useIsRestoring } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import {
  getCollectionStatusLabel,
  getSubjectTypeLabel,
} from '@/features/catalog/subject-types';
import { HomeHeader } from '@/features/home/home-header';
import { HomeMediaSection } from '@/features/home/home-media-section';
import { FriendTimelineRow } from '@/features/timeline/friend-timeline-row';
import { TimelineComposer } from '@/features/timeline/timeline-composer';
import { useFriendTimeline } from '@/features/timeline/use-friend-timeline';
import { usePublicUserCollections } from '@/features/users/use-public-user';
import { useTheme } from '@/features/theme/theme-provider';

export default function HomeScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isRestoring = useIsRestoring();

  // 持久化缓存恢复完成前不挂载业务查询：否则冷启动时 SQLite 里的缓存还没
  // hydrate，6 个查询就会按 staleTime 过期立刻发出网络请求，缓存白做。
  if (isRestoring) {
    return (
      <SafeAreaView style={styles.screen}>
        <HomeState message="正在读取缓存" />
      </SafeAreaView>
    );
  }

  return <HomeContent />;
}

function HomeContent() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedTrackingType, setSelectedTrackingType] = useState(2);
  const { isLoading: isAuthLoading, session } = useAuth();
  const username = session?.user.username ?? '';
  const animeQuery = usePublicUserCollections(username, 2, 'doing');
  const bookQuery = usePublicUserCollections(username, 1, 'doing');
  const musicQuery = usePublicUserCollections(username, 3, 'doing');
  const gameQuery = usePublicUserCollections(username, 4, 'doing');
  const realQuery = usePublicUserCollections(username, 6, 'doing');
  const timelineQuery = useFriendTimeline();
  const trackingQueries = {
    1: bookQuery,
    2: animeQuery,
    3: musicQuery,
    4: gameQuery,
    6: realQuery,
  } as const;
  type TrackingType = keyof typeof trackingQueries;
  const isRefreshing =
    Boolean(session) &&
    [...Object.values(trackingQueries), timelineQuery].some(
      (query) => query.isRefetching && !query.isPending,
    );
  const selectedQuery = trackingQueries[selectedTrackingType as TrackingType];
  const trackingTitle = `${getCollectionStatusLabel(
    selectedTrackingType,
    'doing',
  )}的${getSubjectTypeLabel(selectedTrackingType)}`;
  const showsTrackingSection = Object.values(trackingQueries).some(
    (query) =>
      query.isPending ||
      query.isError ||
      (query.data?.pages[0]?.total ?? 0) > 0,
  );

  useEffect(() => {
    router.prefetch('/explore');
    router.prefetch({ pathname: '/channel/[type]', params: { type: 'anime' } });
    router.prefetch('/rankings');
    router.prefetch('/community');
  }, []);

  function refreshHome() {
    void Promise.all([
      ...Object.values(trackingQueries).map((query) => query.refetch()),
      timelineQuery.refetch(),
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          session ? (
            <RefreshControl
              colors={[colors.accent]}
              onRefresh={refreshHome}
              progressBackgroundColor={colors.surface}
              refreshing={isRefreshing}
              tintColor={colors.accent}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader session={session} />

        {isAuthLoading ? (
          <HomeState message="正在读取账户信息" />
        ) : session ? (
          <>
            {showsTrackingSection ? (
              <HomeMediaSection
                error={selectedQuery.isError}
                items={selectedQuery.data?.pages[0]?.items.slice(0, 8) ?? []}
                loading={selectedQuery.isPending}
                onRetry={() => void selectedQuery.refetch()}
                onSubjectTypeChange={setSelectedTrackingType}
                subjectType={selectedTrackingType}
                title={trackingTitle}
                total={selectedQuery.data?.pages[0]?.total ?? 0}
                username={username}
              />
            ) : null}
            <TimelineBoundary timelineQuery={timelineQuery} />
            <QuickActions />
          </>
        ) : (
          <SignedOutHome />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineBoundary({
  timelineQuery,
}: {
  timelineQuery: ReturnType<typeof useFriendTimeline>;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [composerVisible, setComposerVisible] = useState(false);
  const items = timelineQuery.data?.pages[0]?.items.slice(0, 4) ?? [];

  return (
    <View style={styles.timelineSection}>
      <View style={styles.timelineHeading}>
        <Text accessibilityRole="header" style={styles.quickTitle}>好友动态</Text>
        <Pressable
          accessibilityLabel="发布动态"
          accessibilityRole="button"
          hitSlop={4}
          onPress={() => setComposerVisible(true)}
          style={({ pressed }) => [
            styles.timelinePublishButton,
            pressed && styles.timelinePublishButtonPressed,
          ]}
        >
          <View style={styles.timelinePublishIcon}>
            <SymbolView
              name={{
                android: 'edit',
                ios: 'square.and.pencil',
                web: 'edit',
              }}
              size={16}
              tintColor={colors.ink}
              weight="semibold"
            />
          </View>
          <Text style={styles.timelinePublishText}>发布</Text>
        </Pressable>
      </View>
      <View style={styles.timelineCard}>
        {timelineQuery.isPending ? (
          <View style={styles.timelineInlineState}>
            <ActivityIndicator color={colors.accent} size="small" />
            <Text style={styles.timelineEmptyText}>正在读取好友动态</Text>
          </View>
        ) : timelineQuery.isError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void timelineQuery.refetch()}
            style={({ pressed }) => [
              styles.timelineInlineState,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.timelineErrorText}>暂时没有加载出来，点此重试</Text>
          </Pressable>
        ) : items.length === 0 ? (
          <View style={styles.timelineInlineState}>
            <Text style={styles.timelineEmptyText}>还没有好友动态</Text>
          </View>
        ) : (
          <>
            {items.map((item, index) => (
              <FriendTimelineRow
                hasDivider={index > 0}
                item={item}
                key={item.id}
              />
            ))}
            <Pressable
              accessibilityLabel="查看全部好友动态"
              accessibilityRole="button"
              onPress={() => router.push('/timeline')}
              style={({ pressed }) => [
                styles.timelineAllButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.timelineAllText}>查看全部动态</Text>
              <SymbolView
                name={{
                  android: 'chevron_right',
                  ios: 'chevron.right',
                  web: 'chevron_right',
                }}
                size={12}
                tintColor={colors.accent}
                weight="semibold"
              />
            </Pressable>
          </>
        )}
      </View>
      <TimelineComposer
        onClose={() => setComposerVisible(false)}
        visible={composerVisible}
      />
    </View>
  );
}

function SignedOutHome() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
            tintColor={colors.accent}
          />
        </View>
        <Text style={styles.signedOutTitle}>从记录开始</Text>
        <Text style={styles.signedOutText}>
          登录 Bangumi 后同步在看的动画、在读的书籍和三次元进度。未登录时不会在本机创建另一份记录。
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

function QuickActions() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.quickSection}>
      <Text accessibilityRole="header" style={styles.quickTitle}>发现</Text>
      <View style={styles.quickCard}>
        <QuickActionRow
          href="/explore"
          icon={{
            android: 'calendar_month',
            ios: 'calendar',
            web: 'calendar_month',
          }}
          label="综合"
          meta="频道、放送、排行榜与社区入口"
        />
        <QuickActionRow
          hasDivider
          href={{ pathname: '/channel/[type]', params: { type: 'anime' } }}
          icon={{ android: 'grid_view', ios: 'square.grid.2x2', web: 'grid_view' }}
          label="频道"
          meta="浏览动画、阅读、音乐、游戏与三次元"
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
  href: Href;
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  meta: string;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityHint={meta}
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
            tintColor={colors.accent}
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
          tintColor={colors.subtle}
          weight="semibold"
        />
    </Pressable>
  );
}

function HomeState({ message }: { message: string }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  timelineSection: { marginTop: 34 },
  timelineHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginTop: 14,
    overflow: 'hidden',
    paddingHorizontal: 18,
  },
  timelinePublishButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderCurve: 'continuous',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 5,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  timelinePublishButtonPressed: { backgroundColor: colors.track },
  timelinePublishIcon: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  timelinePublishText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 18,
    textAlignVertical: 'center',
  },
  timelineAllButton: {
    alignItems: 'center',
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: 2,
  },
  timelineAllText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  timelineInlineState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 88,
    paddingHorizontal: 16,
  },
  timelineEmptyText: { color: colors.muted, fontSize: 13 },
  timelineErrorText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  signedOutCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 24,
  },
  signedOutMark: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  signedOutTitle: {
    color: colors.ink,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 24,
  },
  signedOutText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
  },
  loginButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    marginTop: 24,
  },
  loginButtonText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  quickSection: { marginTop: 34 },
  quickTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  quickCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    marginTop: 14,
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
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quickIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  quickCopy: { flex: 1, marginLeft: 13, minWidth: 0 },
  quickLabel: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  quickMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  state: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    gap: 10,
    justifyContent: 'center',
    minHeight: 180,
    padding: 24,
  },
  stateText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  pressed: { opacity: 0.62 },
});
