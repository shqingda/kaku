import { Image } from 'expo-image';
import { Link, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';

import type { PublicEntityDetail } from './model';

export function EntityDetailScreen({
  data,
  isError,
  isPending,
  kind,
  onRetry,
}: {
  data?: PublicEntityDetail;
  isError: boolean;
  isPending: boolean;
  kind: '人物' | '角色';
  onRetry: () => void;
}) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: data?.name ?? `${kind}详情` }} />
      {isPending ? (
        <State text={`正在读取${kind}资料。`} title="加载中" />
      ) : isError || !data ? (
        <State
          action={onRetry}
          text="请检查网络后重试。"
          title={`${kind}资料读取失败`}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={data.relatedSubjects}
          keyExtractor={(item, index) =>
            `${item.id}-${item.relation}-${index}`
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无相关作品。</Text>
            </View>
          }
          ListHeaderComponent={
            <>
              <View style={styles.hero}>
                <View style={styles.portrait}>
                  <Text style={styles.fallback}>{data.name.slice(0, 1)}</Text>
                  {data.imageUrl ? (
                    <Image
                      contentFit="cover"
                      contentPosition="top"
                      source={data.imageUrl}
                      style={StyleSheet.absoluteFill}
                      transition={140}
                    />
                  ) : null}
                </View>
                <View style={styles.heroMain}>
                  <Text style={styles.name}>{data.name}</Text>
                  <Text style={styles.kind}>{kind}</Text>
                </View>
              </View>

              {data.summary ? (
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>简介</Text>
                  <Text style={styles.summary}>{data.summary}</Text>
                </View>
              ) : null}

              {data.metadata.length > 0 ? (
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>资料</Text>
                  {data.metadata.map((item, index) => (
                    <View
                      key={`${item.label}-${index}`}
                      style={[
                        styles.metadataRow,
                        index > 0 && styles.rowBorder,
                      ]}
                    >
                      <Text style={styles.metadataLabel}>{item.label}</Text>
                      <Text style={styles.metadataValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>相关作品</Text>
                <Text style={styles.sectionMeta}>
                  {data.relatedSubjects.length} 项
                </Text>
              </View>
            </>
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
                accessibilityHint="进入相关作品详情"
                accessibilityLabel={`打开${item.title}`}
                accessibilityRole="button"
                style={styles.subjectRow}
              >
                <Link.AppleZoom>
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
                </Link.AppleZoom>
                <View style={styles.subjectMain}>
                  <Text numberOfLines={2} style={styles.subjectTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.relation}>{item.relation}</Text>
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
  content: { gap: 10, padding: 20, paddingBottom: 44 },
  hero: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 12,
    paddingTop: 2,
  },
  portrait: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 22,
    height: 154,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 112,
  },
  fallback: { color: COLORS.subtle, fontSize: 24, fontWeight: '800' },
  heroMain: { flex: 1, marginLeft: 20 },
  name: {
    color: COLORS.ink,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  kind: { color: COLORS.muted, fontSize: 13, marginTop: 8 },
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginTop: 4,
    padding: 18,
  },
  panelTitle: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  summary: { color: COLORS.muted, fontSize: 14, lineHeight: 23 },
  metadataRow: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  rowBorder: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metadataLabel: { color: COLORS.subtle, fontSize: 13, width: 78 },
  metadataValue: {
    color: COLORS.ink,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 18,
  },
  sectionTitle: { color: COLORS.ink, fontSize: 19, fontWeight: '800' },
  sectionMeta: { color: COLORS.subtle, fontSize: 12 },
  subjectRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    flexDirection: 'row',
    minHeight: 88,
    padding: 10,
  },
  cover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 11,
    height: 68,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  coverFallback: { color: COLORS.subtle, fontSize: 14, fontWeight: '700' },
  subjectMain: { flex: 1, marginLeft: 13 },
  subjectTitle: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  relation: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  empty: { alignItems: 'center', padding: 28 },
  emptyText: { color: COLORS.muted, fontSize: 14 },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  stateTitle: { color: COLORS.ink, fontSize: 19, fontWeight: '800' },
  stateText: { color: COLORS.muted, fontSize: 14, marginTop: 8 },
  retry: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: COLORS.accent, fontSize: 14, fontWeight: '800' },
});
