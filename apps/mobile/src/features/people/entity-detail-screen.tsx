import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { AppState } from '@/features/shared/app-state';
import { useAuth } from '@/features/auth/auth-provider';
import { FullscreenImageViewer } from '@/features/shared/fullscreen-image-viewer';
import { playSuccessHaptic } from '@/lib/haptics';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';

import {
  buildEntityListItems,
  EntityRelationRow,
} from './entity-relation-list';
import type { PublicEntityDetail } from './model';
import {
  useEntityCollection,
  useSaveEntityCollection,
} from './use-entity-collection';
import { useEntityComments } from './use-public-entity';

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
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [portraitVisible, setPortraitVisible] = useState(false);
  const entityKind = kind === '角色' ? 'character' : 'person';
  const entityId = data?.id ?? 0;
  const collectionQuery = useEntityCollection(entityKind, entityId);
  const commentsQuery = useEntityComments(entityKind, entityId);
  const saveCollection = useSaveEntityCollection(entityKind, entityId);
  const comments = commentsQuery.data ?? [];
  const {
    handleScrollToIndexFailed,
    highlightedReplyId,
    listRef: commentsListRef,
    openReply,
  } = useReplyNavigation(comments);
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

    const nextCollected = !collectionQuery.data;

    if (!nextCollected) {
      Alert.alert(`取消收藏${kind}？`, `确认将“${data?.name ?? kind}”移出收藏？`, [
        { style: 'cancel', text: '保留' },
        {
          onPress: () => void saveCollectionState(false),
          style: 'destructive',
          text: '取消收藏',
        },
      ]);
      return;
    }

    await saveCollectionState(true);
  }

  async function saveCollectionState(collected: boolean) {
    try {
      await saveCollection.mutateAsync(collected);
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
        <AppState text={`正在读取${kind}资料。`} title="加载中" />
      ) : isError || !data ? (
        <AppState
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
                <Pressable
                  accessibilityLabel={`全屏查看${data.name}图片`}
                  accessibilityRole="button"
                  disabled={!data.imageUrl}
                  onPress={() => setPortraitVisible(true)}
                  style={({ pressed }) => [
                    styles.portrait,
                    pressed && styles.pressed,
                  ]}
                >
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
                </Pressable>
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
                              ? '取消收藏'
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

              <View style={styles.commentsSection}>
                <View style={styles.commentsHeader}>
                  <View>
                    <Text style={styles.panelTitle}>评论</Text>
                    <Text style={styles.commentsMeta}>
                      {data.commentCount.toLocaleString('zh-CN')} 条公开评论
                    </Text>
                  </View>
                  {comments.length > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setCommentsVisible(true)}
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      <Text style={styles.commentsAction}>查看全部</Text>
                    </Pressable>
                  ) : null}
                </View>
                {commentsQuery.isPending ? (
                  <Text style={styles.commentsState}>正在读取评论…</Text>
                ) : commentsQuery.isError ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void commentsQuery.refetch()}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Text style={styles.commentsState}>评论读取失败，点此重试</Text>
                  </Pressable>
                ) : comments.length === 0 ? (
                  <Text style={styles.commentsState}>还没有公开评论。</Text>
                ) : (
                  comments.slice(0, 3).map((reply, index) => (
                    <ReplyListItem
                      floor={index + 1}
                      key={reply.id}
                      onOpenReference={(replyId) => {
                        setCommentsVisible(true);
                        setTimeout(() => openReply(replyId), 220);
                      }}
                      reply={reply}
                    />
                  ))
                )}
              </View>
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
      <Modal
        animationType="slide"
        onRequestClose={() => setCommentsVisible(false)}
        presentationStyle="pageSheet"
        visible={commentsVisible}
      >
        <SafeAreaView edges={['bottom']} style={styles.commentsScreen}>
          <View style={styles.commentsModalHeader}>
            <View>
              <Text style={styles.commentsModalTitle}>{kind}评论</Text>
              <Text style={styles.commentsModalMeta}>{data?.name}</Text>
            </View>
            <Pressable
              accessibilityLabel="关闭评论"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setCommentsVisible(false)}
              style={({ pressed }) => [
                styles.commentsClose,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{ android: 'close', ios: 'xmark', web: 'close' }}
                size={17}
                tintColor={COLORS.ink}
                weight="semibold"
              />
            </Pressable>
          </View>
          <FlatList
            ref={commentsListRef}
            contentContainerStyle={styles.commentsContent}
            data={comments}
            keyExtractor={(reply) => reply.id}
            onRefresh={() => void commentsQuery.refetch()}
            onScrollToIndexFailed={handleScrollToIndexFailed}
            refreshing={commentsQuery.isRefetching}
            renderItem={({ index, item }) => (
              <ReplyListItem
                floor={index + 1}
                isHighlighted={highlightedReplyId === item.id}
                onOpenReference={openReply}
                reply={item}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
      <FullscreenImageViewer
        onClose={() => setPortraitVisible(false)}
        title={data?.name ?? kind}
        url={data?.imageUrl}
        visible={portraitVisible}
      />
    </SafeAreaView>
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
  commentsSection: { marginTop: 10 },
  commentsHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingHorizontal: 4,
    paddingTop: 12,
  },
  commentsMeta: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  commentsAction: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  commentsState: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    color: COLORS.muted,
    fontSize: 13,
    padding: 18,
  },
  commentsScreen: { backgroundColor: COLORS.background, flex: 1 },
  commentsModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  commentsModalTitle: { color: COLORS.ink, fontSize: 22, fontWeight: '800' },
  commentsModalMeta: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  commentsClose: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  commentsContent: { paddingBottom: 36, paddingHorizontal: 20 },
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
  pressed: { opacity: 0.62 },
});
