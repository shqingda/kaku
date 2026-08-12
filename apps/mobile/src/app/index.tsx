import { useEffect, useState, type ComponentProps } from 'react';
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

import { COLORS } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import { HomeHeader } from '@/features/home/home-header';
import { HomeMediaSection } from '@/features/home/home-media-section';
import { FriendTimelineRow } from '@/features/timeline/friend-timeline-row';
import { TimelineComposer } from '@/features/timeline/timeline-composer';
import { useFriendTimeline } from '@/features/timeline/use-friend-timeline';
import { usePublicUserCollections } from '@/features/users/use-public-user';

export default function HomeScreen() {
  const [selectedTrackingType, setSelectedTrackingType] = useState(2);
  const { isLoading: isAuthLoading, session } = useAuth();
  const username = session?.user.username ?? '';
  const animeQuery = usePublicUserCollections(username, 2, 'doing');
  const bookQuery = usePublicUserCollections(username, 1, 'doing');
  const realQuery = usePublicUserCollections(username, 6, 'doing');
  const timelineQuery = useFriendTimeline();
  const isRefreshing =
    Boolean(session) &&
    [animeQuery, bookQuery, realQuery, timelineQuery].some(
      (query) => query.isRefetching && !query.isPending,
    );
  const trackingQueries = {
    1: bookQuery,
    2: animeQuery,
    6: realQuery,
  } as const;
  const selectedQuery = trackingQueries[selectedTrackingType as 1 | 2 | 6];
  const trackingTitle =
    selectedTrackingType === 1
      ? '在读的书籍'
      : selectedTrackingType === 6
        ? '在看的三次元'
        : '在看的动画';
  const showsTrackingSection = [animeQuery, bookQuery, realQuery].some(
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
      animeQuery.refetch(),
      bookQuery.refetch(),
      realQuery.refetch(),
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
              colors={[COLORS.accent]}
              onRefresh={refreshHome}
              progressBackgroundColor={COLORS.surface}
              refreshing={isRefreshing}
              tintColor={COLORS.accent}
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
              tintColor={COLORS.ink}
              weight="semibold"
            />
          </View>
          <Text style={styles.timelinePublishText}>发布</Text>
        </Pressable>
      </View>
      <View style={styles.timelineCard}>
        {timelineQuery.isPending ? (
          <View style={styles.timelineInlineState}>
            <ActivityIndicator color={COLORS.accent} size="small" />
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
                tintColor={COLORS.accent}
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

function HomeState({ message }: { message: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={COLORS.accent} />
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  timelineSection: { marginTop: 34 },
  timelineHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timelineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginTop: 14,
    overflow: 'hidden',
    paddingHorizontal: 18,
  },
  timelinePublishButton: {
    alignItems: 'center',
    backgroundColor: '#EFEEEA',
    borderCurve: 'continuous',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 5,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  timelinePublishButtonPressed: { backgroundColor: '#E4E2DC' },
  timelinePublishIcon: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  timelinePublishText: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 18,
    textAlignVertical: 'center',
  },
  timelineAllButton: {
    alignItems: 'center',
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: 2,
  },
  timelineAllText: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  timelineInlineState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 88,
    paddingHorizontal: 16,
  },
  timelineEmptyText: { color: COLORS.muted, fontSize: 13 },
  timelineErrorText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
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
  quickSection: { marginTop: 34 },
  quickTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  quickCard: {
    backgroundColor: COLORS.surface,
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
  quickLabel: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
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
  stateText: { color: COLORS.muted, fontSize: 14, textAlign: 'center' },
  pressed: { opacity: 0.62 },
});
