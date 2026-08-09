import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import { playSuccessHaptic } from '@/lib/haptics';

import {
  buildEntityListItems,
  EntityRelationRow,
} from './entity-relation-list';
import type { PublicEntityDetail } from './model';
import {
  useEntityCollection,
  useSaveEntityCollection,
} from './use-entity-collection';

export function EntityDetailScreen({
  data,
  isError,
  isPending,
  isRefreshing,
  kind,
  onRetry,
}: {
  data?: PublicEntityDetail;
  isError: boolean;
  isPending: boolean;
  isRefreshing: boolean;
  kind: '人物' | '角色';
  onRetry: () => void;
}) {
  const { isSigningIn, session, signIn } = useAuth();
  const entityKind = kind === '角色' ? 'character' : 'person';
  const entityId = data?.id ?? 0;
  const collectionQuery = useEntityCollection(entityKind, entityId);
  const saveCollection = useSaveEntityCollection(entityKind, entityId);
  const items = useMemo(() => {
    if (!data) return [];
    return buildEntityListItems(data, kind);
  }, [data, kind]);

  async function toggleCollection() {
    if (!session) {
      await signIn();
      return;
    }

    if (collectionQuery.isError) {
      await collectionQuery.refetch();
      return;
    }

    try {
      await saveCollection.mutateAsync(!collectionQuery.data);
      playSuccessHaptic();
    } catch (error) {
      Alert.alert(
        '收藏没有保存',
        error instanceof Error ? error.message : '请稍后重试。',
      );
    }
  }

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
          data={items}
          keyExtractor={(item) => item.id}
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
                  <Text selectable style={styles.name}>
                    {data.name}
                  </Text>
                  <Text numberOfLines={2} style={styles.kind}>
                    {(data.categoryLabels ?? [kind]).join(' · ')}
                  </Text>
                  <Text style={styles.stats}>
                    {(data.collectionCount ?? 0).toLocaleString('zh-CN')} 人收藏
                    {' · '}
                    {(data.commentCount ?? 0).toLocaleString('zh-CN')} 条评论
                  </Text>
                  <Pressable
                    accessibilityLabel={
                      session
                        ? collectionQuery.data
                          ? `取消收藏${kind}`
                          : `收藏${kind}`
                        : `登录后收藏${kind}`
                    }
                    accessibilityRole="button"
                    disabled={
                      isSigningIn ||
                      (Boolean(session) && collectionQuery.isPending) ||
                      saveCollection.isPending
                    }
                    onPress={() => void toggleCollection()}
                    style={({ pressed }) => [
                      styles.collectionButton,
                      collectionQuery.data && styles.collectedButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    {(session && collectionQuery.isPending) ||
                    saveCollection.isPending ? (
                      <ActivityIndicator color={COLORS.accent} size="small" />
                    ) : (
                      <SymbolView
                        name={{
                          android: collectionQuery.data
                            ? 'favorite'
                            : 'favorite_border',
                          ios: collectionQuery.data ? 'heart.fill' : 'heart',
                          web: collectionQuery.data
                            ? 'favorite'
                            : 'favorite_border',
                        }}
                        size={15}
                        tintColor={
                          collectionQuery.data ? COLORS.accent : COLORS.muted
                        }
                        weight="semibold"
                      />
                    )}
                    <Text
                      style={[
                        styles.collectionButtonText,
                        collectionQuery.data && styles.collectedButtonText,
                      ]}
                    >
                      {isSigningIn
                        ? '正在登录'
                        : !session
                          ? '登录后收藏'
                          : collectionQuery.isError
                            ? '重试'
                            : collectionQuery.data
                              ? '已收藏'
                              : '收藏'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {data.summary ? (
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>简介</Text>
                  <Text selectable style={styles.summary}>
                    {data.summary}
                  </Text>
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
                      <Text selectable style={styles.metadataValue}>
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          }
          onRefresh={onRetry}
          refreshing={isRefreshing}
          renderItem={({ item }) => (
            <EntityRelationRow item={item} kind={kind} />
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
  content: {
    alignItems: 'stretch',
    gap: 10,
    padding: 20,
    paddingBottom: 44,
  },
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
  stats: { color: COLORS.subtle, fontSize: 11, marginTop: 6 },
  collectionButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.track,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 7,
    marginTop: 14,
    minHeight: 38,
    paddingHorizontal: 13,
  },
  collectedButton: { backgroundColor: COLORS.accentSoft },
  collectionButtonText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  collectedButtonText: { color: COLORS.accent },
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
  pressed: { opacity: 0.62 },
});
