import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { usePublicIndex } from '@/features/indexes/use-indexes';

export default function PublicIndexScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const indexQuery = usePublicIndex(Number(id));
  const index = indexQuery.data;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: index?.title ?? '目录' }} />
      <FlatList
        contentContainerStyle={styles.content}
        data={index?.items ?? []}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          index ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>目录中暂无动画条目。</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
            <DiscussionStatus
              errorText="目录读取失败，请检查网络后重试。"
              isError={indexQuery.isError}
              isPending={indexQuery.isPending}
              loadingText="正在读取目录内容…"
              onRetry={() => void indexQuery.refetch()}
            />
            {index ? (
              <View style={styles.headerCard}>
                <Text style={styles.title}>{index.title}</Text>
                {index.authorUsername ? (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/user/[username]',
                        params: { username: index.authorUsername! },
                      })
                    }
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
              </View>
            ) : null}
            {index ? (
              <Text style={styles.sectionTitle}>动画条目</Text>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/subject/[id]',
                params: { id: String(item.id) },
              })
            }
            style={({ pressed }) => [
              styles.subjectRow,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.cover}>
              <Text style={styles.coverFallback}>
                {item.title.slice(0, 1)}
              </Text>
              {item.coverUrl ? (
                <Image
                  contentFit="cover"
                  source={item.coverUrl}
                  style={StyleSheet.absoluteFill}
                  transition={120}
                />
              ) : null}
            </View>
            <View style={styles.subjectMain}>
              <Text numberOfLines={2} style={styles.subjectTitle}>
                {item.title}
              </Text>
              <Text numberOfLines={2} style={styles.subjectMeta}>
                {item.score ? `${item.score.toFixed(1)} 分` : '暂无评分'}
                {item.comment ? ` · ${item.comment}` : ''}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { gap: 10, padding: 20, paddingBottom: 44 },
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 20,
  },
  title: {
    color: COLORS.ink,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  author: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  description: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
  },
  stats: { color: COLORS.subtle, fontSize: 12, marginTop: 14 },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingTop: 14,
  },
  subjectRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    flexDirection: 'row',
    minHeight: 92,
    padding: 10,
  },
  cover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 11,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 51,
  },
  coverFallback: { color: COLORS.subtle, fontSize: 14, fontWeight: '700' },
  subjectMain: { flex: 1, marginLeft: 13 },
  subjectTitle: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  subjectMeta: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  chevron: { color: COLORS.subtle, fontSize: 24, marginLeft: 8 },
  pressed: { opacity: 0.62 },
  empty: { alignItems: 'center', padding: 28 },
  emptyText: { color: COLORS.muted, fontSize: 14 },
});
