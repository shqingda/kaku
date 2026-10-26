import { useLayoutEffect, useState } from 'react';
import { useIsRestoring, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { SPACING, TYPE } from '@/constants/design';
import { readHomeTrackingType, saveHomeTrackingType } from '@/features/preferences/view-preferences';
import { useAuth } from '@/features/auth/auth-provider';
import {
  getCollectionStatusLabel,
  getSubjectTypeLabel,
} from '@/features/catalog/subject-types';
import { HomeHeader } from '@/features/home/home-header';
import { HomeMediaSection } from '@/features/home/home-media-section';
import { HomeQuickActions } from '@/features/home/home-quick-actions';
import { HomeTimelineSection } from '@/features/home/home-timeline-section';
import { SignedOutHome } from '@/features/home/signed-out-home';
import { SkeletonList } from '@/features/shared/skeleton-list';
import { useTheme } from '@/features/theme/theme-provider';
import { useFriendTimeline } from '@/features/timeline/use-friend-timeline';
import {
  prefetchPublicUserCollections,
  usePublicUserCollections,
} from '@/features/users/use-public-user';
import { startupTiming } from '@/lib/startup-timing';

export default function HomeScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const isRestoring = useIsRestoring();

  // 缓存恢复期间展示与首页同构的骨架，恢复后由查询决定是否需要刷新。
  if (isRestoring) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <HomeHeader session={null} />
          <View style={styles.skeletonSlot}>
            <SkeletonList
              accessibilityLabel="正在读取缓存"
              count={3}
              rowHeight={150}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return <HomeContent />;
}

function HomeContent() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const queryClient = useQueryClient();
  const [selectedTrackingType, setSelectedTrackingType] = useState(readHomeTrackingType);
  const { isLoading: isAuthLoading, session } = useAuth();
  const username = session?.user.username ?? '';

  const selectedQuery = usePublicUserCollections(username, selectedTrackingType, 'doing');
  const timelineQuery = useFriendTimeline();
  // The first tracking section is usable only after account restoration and its
  // query settle. Cached content is usable even while a refresh is running.
  useLayoutEffect(() => {
    if (isAuthLoading) return;
    if (!session) { startupTiming.markHomeReady('guest'); return; }
    if (selectedQuery.data) {
      startupTiming.markHomeReady(selectedQuery.data.pages[0]?.items.length ? 'content' : 'empty');
    } else if (selectedQuery.isError) {
      startupTiming.markHomeReady('error');
    }
  }, [isAuthLoading, session, selectedQuery.data, selectedQuery.isError]);
  const isRefreshing =
    Boolean(session) &&
    [selectedQuery, timelineQuery].some(
      (query) => query.isRefetching && !query.isPending,
    );
  const trackingTitle = `${getCollectionStatusLabel(
    selectedTrackingType,
    'doing',
  )}的${getSubjectTypeLabel(selectedTrackingType)}`;

  function refreshHome() {
    void Promise.all([
      selectedQuery.refetch(),
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
      >
        <HomeHeader session={session} />

        {isAuthLoading ? (
          <HomeState message="正在读取账户信息" />
        ) : session ? (
          <>
            <HomeMediaSection
              error={selectedQuery.isError}
              items={selectedQuery.data?.pages[0]?.items.slice(0, 8) ?? []}
              loading={selectedQuery.isPending}
              onRetry={() => void selectedQuery.refetch()}
              onSubjectTypeChange={(type) => {
                setSelectedTrackingType(type);
                saveHomeTrackingType(type);
              }}
              onSubjectTypePressIn={(type) =>
                prefetchPublicUserCollections(queryClient, username, type, 'doing')
              }
              subjectType={selectedTrackingType}
              title={trackingTitle}
              total={selectedQuery.data?.pages[0]?.total ?? 0}
              username={username}
            />
            <HomeTimelineSection timelineQuery={timelineQuery} />
            <HomeQuickActions />
          </>
        ) : (
          <SignedOutHome />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeState({ message }: { message: string }) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: SPACING.xl * 2, paddingHorizontal: SPACING.xl },
  skeletonSlot: { marginTop: SPACING.xl },
  state: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    gap: SPACING.md,
    justifyContent: 'center',
    minHeight: 180,
    padding: SPACING.xl,
  },
  stateText: { color: colors.muted, fontSize: TYPE.body.fontSize, textAlign: 'center' },
});
