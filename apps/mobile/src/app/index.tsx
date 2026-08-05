import type { ComponentProps } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Linking,
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
import { usePublicUserCollections } from '@/features/users/use-public-user';

export default function HomeScreen() {
  const { isLoading: isAuthLoading, session } = useAuth();
  const username = session?.user.username ?? '';
  const animeQuery = usePublicUserCollections(username, 2, 'doing');
  const bookQuery = usePublicUserCollections(username, 1, 'doing');
  const realQuery = usePublicUserCollections(username, 6, 'doing');
  const isRefreshing =
    Boolean(session) &&
    [animeQuery, bookQuery, realQuery].some(
      (query) => query.isRefetching && !query.isPending,
    );

  function refreshHome() {
    void Promise.all([
      animeQuery.refetch(),
      bookQuery.refetch(),
      realQuery.refetch(),
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
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
            <HomeMediaSection
              error={animeQuery.isError}
              items={animeQuery.data?.pages[0]?.items.slice(0, 8) ?? []}
              loading={animeQuery.isPending}
              onRetry={() => void animeQuery.refetch()}
              subjectType={2}
              title="在看的动画"
              total={animeQuery.data?.pages[0]?.total ?? 0}
              username={username}
            />
            <HomeMediaSection
              error={bookQuery.isError}
              items={bookQuery.data?.pages[0]?.items.slice(0, 8) ?? []}
              loading={bookQuery.isPending}
              onRetry={() => void bookQuery.refetch()}
              subjectType={1}
              title="在读的书籍"
              total={bookQuery.data?.pages[0]?.total ?? 0}
              username={username}
            />
            <HomeMediaSection
              error={realQuery.isError}
              items={realQuery.data?.pages[0]?.items.slice(0, 8) ?? []}
              loading={realQuery.isPending}
              onRetry={() => void realQuery.refetch()}
              subjectType={6}
              title="在看的三次元"
              total={realQuery.data?.pages[0]?.total ?? 0}
              username={username}
            />
            <TimelineBoundary />
            <QuickActions />
          </>
        ) : (
          <SignedOutHome />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineBoundary() {
  return (
    <View style={styles.timelineSection}>
      <View style={styles.timelineHeading}>
        <Text style={styles.quickTitle}>好友动态</Text>
      </View>
      <View style={styles.timelineCard}>
        <SymbolView
          name={{
            android: 'dynamic_feed',
            ios: 'person.2',
            web: 'dynamic_feed',
          }}
          size={22}
          tintColor={COLORS.accent}
          weight="medium"
        />
        <View style={styles.timelineCopy}>
          <Text style={styles.timelineTitle}>查看好友动态</Text>
          <Text style={styles.timelineText}>
            好友动态与发布暂时通过 Bangumi 原版完成。
          </Text>
          <View style={styles.timelineActions}>
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL('https://bgm.tv/timeline')}
              style={({ pressed }) => [
                styles.timelineAction,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.timelineActionText}>查看动态</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() =>
                void Linking.openURL('https://bgm.tv/timeline?type=say')
              }
              style={({ pressed }) => [
                styles.timelineAction,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.timelineActionText}>发布</Text>
            </Pressable>
          </View>
        </View>
      </View>
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
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    flexDirection: 'row',
    gap: 13,
    marginTop: 14,
    padding: 18,
  },
  timelineCopy: { flex: 1 },
  timelineTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  timelineText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  timelineActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  timelineAction: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 12,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  timelineActionText: { color: COLORS.accent, fontSize: 13, fontWeight: '800' },
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
