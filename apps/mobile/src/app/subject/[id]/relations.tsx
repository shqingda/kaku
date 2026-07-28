import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { useSubjectRelations } from '@/features/subject-extras/use-subject-extras';

export default function SubjectRelationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const relationsQuery = useSubjectRelations(Number(id));

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '关联条目' }} />
      {relationsQuery.isPending ? (
        <State title="正在读取关联条目" text="系列作品和音乐条目加载中。" />
      ) : relationsQuery.isError ? (
        <State
          action={() => void relationsQuery.refetch()}
          title="关联条目读取失败"
          text="请检查网络后重试。"
        />
      ) : (
        <FlatList
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.content}
          data={relationsQuery.data}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          ListEmptyComponent={
            <State title="暂无关联条目" text="Bangumi 尚未收录关联作品。" />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>关联条目</Text>
              <Text style={styles.meta}>
                {relationsQuery.data.length} 个相关作品
              </Text>
            </View>
          }
          numColumns={2}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cover}>
                <Text style={styles.fallback}>{item.title.slice(0, 1)}</Text>
                {item.coverUrl ? (
                  <Image
                    contentFit="cover"
                    source={item.coverUrl}
                    style={StyleSheet.absoluteFill}
                    transition={140}
                  />
                ) : null}
                <View style={styles.relationBadge}>
                  <Text style={styles.relationText}>{item.relation}</Text>
                </View>
              </View>
              <Text numberOfLines={2} style={styles.name}>
                {item.title}
              </Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function State({
  action,
  text,
  title,
}: {
  action?: () => void;
  text: string;
  title: string;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
      {action ? (
        <Pressable onPress={action} style={styles.retry}>
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { paddingBottom: 44, paddingHorizontal: 20 },
  row: { gap: 14 },
  header: { paddingBottom: 20, paddingTop: 14 },
  title: {
    color: COLORS.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  meta: { color: COLORS.muted, fontSize: 13, marginTop: 6 },
  card: { flex: 1, marginBottom: 22, maxWidth: '48%' },
  cover: {
    alignItems: 'center',
    aspectRatio: 0.72,
    backgroundColor: COLORS.track,
    borderRadius: 18,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallback: { color: COLORS.subtle, fontSize: 24, fontWeight: '700' },
  relationBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    bottom: 9,
    left: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    position: 'absolute',
  },
  relationText: { color: COLORS.ink, fontSize: 10, fontWeight: '800' },
  name: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 9,
  },
  state: { alignItems: 'center', padding: 32 },
  stateTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '800' },
  stateText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: COLORS.accent, fontSize: 14, fontWeight: '800' },
});
