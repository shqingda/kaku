import { useMemo, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Alert,
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
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { TopicComposer } from '@/features/discussions/topic-composer';
import { TopicList } from '@/features/discussions/topic-list';
import { useBangumiSubjectTopics } from '@/features/discussions/use-bangumi-discussions';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function SubjectDiscussionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [composerVisible, setComposerVisible] = useState(false);
  const subjectId = parsePositiveIntegerRouteParam(id);
  const subjectQuery = useCatalogSubject(subjectId ?? 0);
  const discussionQuery = useBangumiSubjectTopics(subjectId ?? 0, 30);
  const subjectTopics = useMemo(
    () =>
      discussionQuery.data?.pages.flatMap((page) => page.topics) ?? [],
    [discussionQuery.data],
  );
  const topicTotal = discussionQuery.data?.pages[0]?.total ?? 0;

  function openTopicComposer() {
    if (session) {
      setComposerVisible(true);
      return;
    }

    Alert.alert(
      '登录后发布话题',
      '话题会发布到你的 Bangumi 账户。',
      [
        { style: 'cancel', text: '取消' },
        { onPress: () => router.push('/account'), text: '去登录' },
      ],
    );
  }

  if (!subjectId) {
    return <InvalidRouteState message="这个讨论版链接缺少有效条目编号。" />;
  }

  if (subjectQuery.isError) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <Stack.Screen options={{ title: '讨论版' }} />
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>条目资料读取失败</Text>
          <Text style={styles.errorText}>请检查网络后重试。</Text>
          <Pressable
            accessibilityLabel="重新读取条目资料"
            accessibilityRole="button"
            onPress={() => void subjectQuery.refetch()}
            style={({ pressed }) => [
              styles.errorRetry,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.errorRetryText}>重试</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '讨论版' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={({ nativeEvent }) => {
          const distanceFromBottom =
            nativeEvent.contentSize.height -
            nativeEvent.layoutMeasurement.height -
            nativeEvent.contentOffset.y;

          if (
            distanceFromBottom < 240 &&
            discussionQuery.hasNextPage &&
            !discussionQuery.isFetchingNextPage &&
            !discussionQuery.isFetchNextPageError
          ) {
            void discussionQuery.fetchNextPage();
          }
        }}
        refreshControl={
          <RefreshControl
            onRefresh={() =>
              void Promise.all([
                subjectQuery.refetch(),
                discussionQuery.refetch(),
              ])
            }
            refreshing={
              (subjectQuery.isRefetching || discussionQuery.isRefetching) &&
              !subjectQuery.isPending &&
              !discussionQuery.isPending
            }
            tintColor={COLORS.accent}
          />
        }
        scrollEventThrottle={160}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            {subjectQuery.data?.title ?? '正在读取条目'}
          </Text>
          <Text style={styles.title}>讨论版</Text>
          <Text style={styles.subtitle}>
            {discussionQuery.data
              ? `Bangumi 共 ${topicTotal} 个话题`
              : '正在从 Bangumi 读取话题'}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="新建话题"
          accessibilityRole="button"
          onPress={openTopicComposer}
          style={({ pressed }) => [
            styles.newTopicButton,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{
              android: 'add_comment',
              ios: 'square.and.pencil',
              web: 'add_comment',
            }}
            size={15}
            tintColor={COLORS.surface}
            weight="semibold"
          />
          <Text style={styles.newTopicText}>新建话题</Text>
        </Pressable>
        <DiscussionStatus
          isError={discussionQuery.isError && subjectTopics.length === 0}
          isPending={discussionQuery.isPending}
          onRetry={() => void discussionQuery.refetch()}
        />
        <TopicList
          emptyText={
            discussionQuery.isError
              ? '讨论加载失败，点击上方重试。'
              : 'Bangumi 还没有关于这个条目的讨论。'
          }
          onOpenTopic={(topic) =>
            router.push({
              pathname: '/subject/[id]/topic/[topicId]',
              params: { id: String(subjectId), topicId: topic.id },
            })
          }
          topics={subjectTopics}
          footer={
            subjectTopics.length > 0 ? (
              <PagedListFooter
                hasNextPage={discussionQuery.hasNextPage}
                isError={discussionQuery.isFetchNextPageError}
                isFetching={discussionQuery.isFetchingNextPage}
                loadedCount={subjectTopics.length}
                onRetry={() => void discussionQuery.fetchNextPage()}
                total={topicTotal}
              />
            ) : null
          }
        />
      </ScrollView>
      <TopicComposer
        onClose={() => setComposerVisible(false)}
        onCreated={(topicId) => {
          setComposerVisible(false);
          router.push({
            pathname: '/subject/[id]/topic/[topicId]',
            params: { id: String(subjectId), topicId: String(topicId) },
          });
        }}
        target={{ kind: 'subject', subjectId }}
        visible={composerVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 48 },
  header: { marginBottom: 18, paddingHorizontal: 4, paddingTop: 4 },
  eyebrow: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  title: {
    color: COLORS.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 7,
  },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  newTopicButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginBottom: 14,
    minHeight: 46,
  },
  newTopicText: { color: COLORS.surface, fontSize: 14, fontWeight: '800' },
  errorState: { flex: 1, justifyContent: 'center', padding: 32 },
  errorTitle: { color: COLORS.ink, fontSize: 22, fontWeight: '700' },
  errorText: { color: COLORS.muted, fontSize: 15, lineHeight: 23, marginTop: 8 },
  errorRetry: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    borderRadius: 13,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 20,
  },
  errorRetryText: { color: COLORS.surface, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
