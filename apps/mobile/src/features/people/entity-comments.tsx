import { userErrorMessage } from '@/lib/user-error-message';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { HIT_SLOP } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import { DiscussionReplyComposer } from '@/features/discussions/discussion-reply-composer';
import type { DiscussionReply } from '@/features/discussions/model';
import { ReplyListItem } from '@/features/discussions/reply-list-item';
import { useDeleteEntityReply } from '@/features/discussions/use-delete-reply';
import { useReplyComposer } from '@/features/discussions/use-reply-composer';
import { useReplyNavigation } from '@/features/discussions/use-reply-navigation';
import { AppSheet } from '@/features/shared/app-sheet';
import { ScrollNavButton } from '@/features/shared/scroll-nav-button';
import { useScrollToTopButton } from '@/features/shared/use-scroll-to-top-button';
import { useTheme } from '@/features/theme/theme-provider';

import { useEntityComments } from './use-public-entity';

export function EntityComments({
  children,
  commentCount,
  entityId,
  entityKind,
  initialReplyId,
  kind,
  name,
}: {
  children: (preview: ReactNode) => ReactNode;
  commentCount: number;
  entityId: number;
  entityKind: 'character' | 'person';
  initialReplyId?: string;
  kind: '人物' | '角色';
  name: string;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // FlatList 在 Android 上必须用确定高度 + flex:1 才能滚动（maxHeight 不被
  // VirtualizedList 可靠尊重）。92% 为 AppSheet 上限，24 为拖拽把手与内边距。
  const commentsBodyHeight = Math.max(320, windowHeight * 0.92 - 24);
  const { isSigningIn, session } = useAuth();
  const composer = useReplyComposer();
  const [sheetVisible, setSheetVisible] = useState(false);
  const commentsQuery = useEntityComments(entityKind, entityId);
  const deleteReply = useDeleteEntityReply(entityKind, entityId);
  const comments = commentsQuery.data ?? [];
  const replyNavigation = useReplyNavigation(comments);
  const scrollToTop = useScrollToTopButton(replyNavigation.listRef);
  const pendingReplyIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!initialReplyId) {
      return;
    }
    pendingReplyIdRef.current = initialReplyId;
    setSheetVisible(true);
  }, [initialReplyId]);

  function openReplyInSheet(replyId: string) {
    pendingReplyIdRef.current = replyId;
    setSheetVisible(true);
  }

  function handleSheetEntered() {
    const replyId = pendingReplyIdRef.current;
    pendingReplyIdRef.current = undefined;
    if (replyId) {
      replyNavigation.openReply(replyId);
    }
  }

  function confirmDeleteReply(reply: DiscussionReply) {
    Alert.alert('删除这条评论？', '删除后无法恢复。', [
      { style: 'cancel', text: '取消' },
      {
        onPress: () => {
          const commentId = Number(reply.id);
          if (Number.isInteger(commentId)) {
            deleteReply.mutate(commentId, {
              onError: (error) =>
                Alert.alert('评论没有删除', userErrorMessage(error)),
            });
          }
        },
        style: 'destructive',
        text: '删除',
      },
    ]);
  }

  const preview = (
      <View style={styles.commentsSection}>
        <View style={styles.commentsHeader}>
          <View>
            <Text accessibilityRole="header" style={styles.commentsHeaderTitle}>
              评论
            </Text>
            <Text style={styles.commentsHeaderMeta}>
              {commentCount.toLocaleString('zh-CN')} 条公开评论
            </Text>
          </View>
          <Pressable
            accessibilityLabel={session ? `评论这个${kind}` : '登录后评论'}
            accessibilityRole="button"
            disabled={isSigningIn}
            hitSlop={HIT_SLOP}
            onPress={() => void composer.open()}
            style={({ pressed }) => [
              styles.publishButton,
              pressed && styles.publishButtonPressed,
            ]}
          >
            <View style={styles.publishIcon}>
              <SymbolView
                name={{
                  android: 'edit',
                  ios: 'square.and.pencil',
                  web: 'edit',
                }}
                size={16}
                tintColor={colors.ink}
                weight="semibold"
              />
            </View>
            <Text style={styles.publishText}>发布</Text>
          </Pressable>
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
          <View style={styles.commentsCard}>
            {comments.slice(0, 3).map((reply, index) => (
              <ReplyListItem
                embedded
                floor={index + 1}
                hasDivider={index > 0}
                key={reply.id}
                onDelete={confirmDeleteReply}
                onEdit={composer.openEdit}
                onOpenReference={openReplyInSheet}
                onReply={composer.open}
                ownerUsername={session?.user.username}
                reply={reply}
              />
            ))}
            <Pressable
              accessibilityLabel="查看全部评论"
              accessibilityRole="button"
              onPress={() => setSheetVisible(true)}
              style={({ pressed }) => [
                styles.commentsAllButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.commentsAllText}>查看全部</Text>
              <SymbolView
                name={{
                  android: 'chevron_right',
                  ios: 'chevron.right',
                  web: 'chevron_right',
                }}
                size={12}
                tintColor={colors.accent}
                weight="semibold"
              />
            </Pressable>
          </View>
        )}
      </View>
  );

  return (
    <>
      {children(preview)}
      <AppSheet
        onClose={() => setSheetVisible(false)}
        onEntered={handleSheetEntered}
        visible={sheetVisible}
      >
        <View style={[styles.commentsSheetBody, { height: commentsBodyHeight }]}>
          <View style={styles.commentsModalHeader}>
            <Pressable
              accessibilityLabel="回到评论顶部"
              accessibilityRole="button"
              onPress={scrollToTop.scrollToTop}
              style={({ pressed }) => [
                styles.commentsHeaderTapTarget,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.commentsModalTitle}>{kind}评论</Text>
              <Text style={styles.commentsModalMeta}>{name}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="关闭评论"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setSheetVisible(false)}
              style={({ pressed }) => [
                styles.commentsClose,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{ android: 'close', ios: 'xmark', web: 'close' }}
                size={17}
                tintColor={colors.ink}
                weight="semibold"
              />
            </Pressable>
          </View>
          <FlatList
            ref={replyNavigation.listRef}
            contentContainerStyle={[
              styles.commentsContent,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
            data={comments}
            initialNumToRender={10}
            keyExtractor={(reply) => reply.id}
            maxToRenderPerBatch={10}
            onRefresh={() => void commentsQuery.refetch()}
            onScroll={scrollToTop.handleScroll}
            onScrollToIndexFailed={replyNavigation.handleScrollToIndexFailed}
            refreshing={commentsQuery.isRefetching}
            renderItem={({ index, item }) => (
              <ReplyListItem
                floor={index + 1}
                isHighlighted={replyNavigation.highlightedReplyId === item.id}
                onDelete={confirmDeleteReply}
                onEdit={composer.openEdit}
                onOpenReference={replyNavigation.openReply}
                onReply={composer.open}
                ownerUsername={session?.user.username}
                reply={item}
              />
            )}
            scrollEventThrottle={80}
            showsVerticalScrollIndicator={false}
            style={styles.commentsList}
            updateCellsBatchingPeriod={40}
            windowSize={9}
          />
          <ScrollNavButton
            onPress={scrollToTop.scrollToTop}
            visible={scrollToTop.visible}
          />
        </View>
      </AppSheet>
      <DiscussionReplyComposer
        {...composer.sheetProps}
        target={{ id: entityId, kind: entityKind }}
      />
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    commentsSection: { marginTop: 10 },
    commentsHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: 10,
      paddingHorizontal: 4,
      paddingTop: 12,
    },
    commentsHeaderTitle: {
      color: colors.ink,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.35,
    },
    commentsHeaderMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
    publishButton: {
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderCurve: 'continuous',
      borderRadius: 12,
      flexDirection: 'row',
      gap: 5,
      height: 34,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    publishButtonPressed: { backgroundColor: colors.track },
    publishIcon: {
      alignItems: 'center',
      height: 18,
      justifyContent: 'center',
      width: 18,
    },
    publishText: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '700',
      includeFontPadding: false,
      lineHeight: 18,
      textAlignVertical: 'center',
    },
    commentsCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      marginTop: 4,
      overflow: 'hidden',
      paddingHorizontal: 18,
    },
    commentsAllButton: {
      alignItems: 'center',
      borderTopColor: colors.divider,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 50,
      paddingHorizontal: 2,
    },
    commentsAllText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
    commentsState: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      color: colors.muted,
      fontSize: 13,
      padding: 18,
    },
    commentsSheetBody: { flexShrink: 1 },
    commentsModalHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: 14,
      paddingTop: 12,
    },
    commentsHeaderTapTarget: {
      flex: 1,
      justifyContent: 'center',
      minHeight: 44,
      paddingRight: 12,
    },
    commentsModalTitle: { color: colors.ink, fontSize: 22, fontWeight: '800' },
    commentsModalMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
    commentsClose: {
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      borderRadius: 18,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    commentsList: { flex: 1 },
    commentsContent: { paddingBottom: 12 },
    pressed: { opacity: 0.62 },
  });
