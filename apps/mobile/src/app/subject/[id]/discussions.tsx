import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { TopicList } from '@/features/discussions/topic-list';
import { useBangumiSubjectTopics } from '@/features/discussions/use-bangumi-discussions';

export default function SubjectDiscussionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const subjectId = Number(id);
  const subjectQuery = useCatalogSubject(subjectId);
  const discussionQuery = useBangumiSubjectTopics(subjectId, 50);
  const subjectTopics = discussionQuery.data?.topics ?? [];

  if (subjectQuery.isError) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <Stack.Screen options={{ title: '讨论版' }} />
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>条目资料读取失败</Text>
          <Text style={styles.errorText}>请检查网络后返回重试。</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '讨论版' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            {subjectQuery.data?.title ?? '正在读取条目'}
          </Text>
          <Text style={styles.title}>讨论版</Text>
          <Text style={styles.subtitle}>
            {discussionQuery.data
              ? `Bangumi 共 ${discussionQuery.data.total} 个话题`
              : '正在从 Bangumi 读取话题'}
          </Text>
        </View>
        <DiscussionStatus
          isError={discussionQuery.isError}
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
        />
      </ScrollView>
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
  errorState: { flex: 1, justifyContent: 'center', padding: 32 },
  errorTitle: { color: COLORS.ink, fontSize: 22, fontWeight: '700' },
  errorText: { color: COLORS.muted, fontSize: 15, lineHeight: 23, marginTop: 8 },
});
