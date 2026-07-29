import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { useSubjectRelations } from '@/features/subject-extras/use-subject-extras';

const TYPE_LABELS: Record<number, string> = {
  1: '书籍',
  2: '动画',
  3: '音乐',
  4: '游戏',
  6: '三次元',
};

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
          renderItem={({ item }) => (
            <Link
              asChild
              href={{
                pathname: '/subject/[id]',
                params: { id: String(item.id) },
              }}
            >
              <Pressable
                accessibilityLabel={`打开${item.title}详情`}
                accessibilityRole="button"
                accessibilityHint="进入该关联条目的详情页面"
                style={styles.card}
              >
                <Link.AppleZoom>
                  <View style={styles.cover}>
                    <Text style={styles.fallback}>
                      {item.title.slice(0, 1)}
                    </Text>
                    {item.coverUrl ? (
                      <Image
                        contentFit="cover"
                        source={item.coverUrl}
                        style={StyleSheet.absoluteFill}
                        transition={140}
                      />
                    ) : null}
                  </View>
                </Link.AppleZoom>
                <View style={styles.cardMain}>
                  <View style={styles.badges}>
                    <View style={styles.relationBadge}>
                      <Text style={styles.relationText}>{item.relation}</Text>
                    </View>
                    <Text style={styles.type}>
                      {TYPE_LABELS[item.type] ?? '条目'}
                    </Text>
                  </View>
                  <Text numberOfLines={3} style={styles.name}>
                    {item.title}
                  </Text>
                  <Text style={styles.openHint}>查看条目详情</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </Link>
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
  header: { paddingBottom: 20, paddingTop: 14 },
  title: {
    color: COLORS.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  meta: { color: COLORS.muted, fontSize: 13, marginTop: 6 },
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    flexDirection: 'row',
    marginBottom: 12,
    minHeight: 132,
    padding: 12,
  },
  cover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 13,
    height: 108,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 78,
  },
  fallback: { color: COLORS.subtle, fontSize: 24, fontWeight: '700' },
  cardMain: { flex: 1, marginLeft: 14 },
  badges: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  relationBadge: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  relationText: { color: COLORS.accent, fontSize: 10, fontWeight: '800' },
  type: { color: COLORS.subtle, fontSize: 11, fontWeight: '700' },
  name: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
    marginTop: 8,
  },
  openHint: { color: COLORS.subtle, fontSize: 11, marginTop: 7 },
  chevron: { color: COLORS.subtle, fontSize: 28, marginLeft: 8 },
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
