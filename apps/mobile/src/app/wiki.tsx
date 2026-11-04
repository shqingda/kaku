import { useMemo } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { useTheme } from '@/features/theme/theme-provider';
import type { PublicWikiRevision } from '@/features/wiki/model';
import { useWikiRevisions } from '@/features/wiki/use-wiki-revisions';
import { formatActivityTime } from '@/lib/format-activity-time';

export default function WikiScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const revisionsQuery = useWikiRevisions();
  const revisions = useMemo(
    () => revisionsQuery.data?.items ?? [],
    [revisionsQuery.data],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '维基动态' }} />
      <FlatList
        contentContainerStyle={styles.content}
        data={revisions}
        initialNumToRender={12}
        keyExtractor={(item) => `${item.subjectId}-${item.revisionUrl}`}
        ListEmptyComponent={
          revisionsQuery.fetchStatus === 'paused' ? (
            <AppState
              action={() => void revisionsQuery.refetch()}
              title="当前离线"
              text="恢复连接后可继续读取维基动态。"
            />
          ) : revisionsQuery.isPending ? (
            <AppState title="正在读取维基动态" text="最新公开修订加载中。" />
          ) : revisionsQuery.isError ? (
            <AppState
              action={() => void revisionsQuery.refetch()}
              title="维基动态读取失败"
              text="Bangumi 偶尔会响应较慢，请稍后重试。"
            />
          ) : (
            <AppState title="暂无修订" text="这里暂时没有公开的条目修订。" />
          )
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>维基动态</Text>
            <Text style={styles.meta}>查看 Bangumi 最近的公开条目修订</Text>
            {revisions.length > 0 && (revisionsQuery.isError || revisionsQuery.fetchStatus === 'paused') ? (
              <CachedDataNotice onRetry={() => void revisionsQuery.refetch()} retrying={revisionsQuery.isRefetching} />
            ) : null}
          </View>
        }
        maxToRenderPerBatch={12}
        refreshControl={
          <AppRefreshControl
            onRefresh={() => void revisionsQuery.refetch()}
            refreshing={revisionsQuery.isRefetching && !revisionsQuery.isPending}
          />
        }
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ index, item }) => (
          <RevisionRow
            hasDivider={index > 0}
            isFirst={index === 0}
            isLast={index === revisions.length - 1}
            item={item}
            styles={styles}
            tintColor={colors.accent}
          />
        )}
        showsVerticalScrollIndicator={false}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

function RevisionRow({
  hasDivider,
  isFirst,
  isLast,
  item,
  styles,
  tintColor,
}: {
  hasDivider: boolean;
  isFirst: boolean;
  isLast: boolean;
  item: PublicWikiRevision;
  styles: ReturnType<typeof createStyles>;
  tintColor: string;
}) {
  return (
    <View
      style={[
        styles.rowCard,
        isFirst && styles.firstRowCard,
        isLast && styles.lastRowCard,
      ]}
    >
      <Pressable
        accessibilityLabel={`打开条目：${item.title}`}
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: '/subject/[id]',
            params: { id: String(item.subjectId) },
          })
        }
        style={({ pressed }) => [
          styles.row,
          hasDivider && styles.rowDivider,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.revisionIcon}>
          <SymbolView
            name={{ android: 'edit_note', ios: 'pencil.line', web: 'edit_note' }}
            size={19}
            tintColor={tintColor}
          />
        </View>
        <View style={styles.rowMain}>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.rowTitle}>{item.title}</Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.note}>
            {item.note || '更新条目信息'}
          </Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.rowMeta}>
            {item.author} · {formatActivityTime(item.editedAt)}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`查看“${item.title}”的修改对比`}
          accessibilityRole="link"
          hitSlop={HIT_SLOP}
          onPress={(event) => {
            event.stopPropagation();
            void WebBrowser.openBrowserAsync(item.revisionUrl);
          }}
          style={({ pressed }) => [styles.compare, pressed && styles.pressed]}
        >
          <Text style={styles.compareText}>对比</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: SPACING.xxl + SPACING.lg, paddingHorizontal: SPACING.xl },
  header: { paddingBottom: SPACING.lg, paddingTop: SPACING.xl, gap: SPACING.sm },
  title: { color: colors.ink, ...TYPE.display, fontWeight: '800' },
  meta: { color: colors.muted, ...TYPE.caption },
  rowCard: { backgroundColor: colors.surface, paddingHorizontal: SPACING.lg },
  firstRowCard: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  lastRowCard: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  row: { alignItems: 'center', flexDirection: 'row', minHeight: 112, paddingVertical: SPACING.lg },
  rowDivider: { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth },
  revisionIcon: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  rowMain: { flex: 1, marginLeft: SPACING.md, minWidth: 0 },
  rowTitle: { color: colors.ink, ...TYPE.body, fontWeight: '800' },
  note: { color: colors.muted, ...TYPE.caption, marginTop: SPACING.xs },
  rowMeta: { color: colors.subtle, ...TYPE.micro, marginTop: SPACING.sm },
  compare: { alignItems: 'center', backgroundColor: colors.background, borderRadius: 11, justifyContent: 'center', marginLeft: SPACING.md, minHeight: MIN_TOUCH_SIZE, paddingHorizontal: SPACING.md },
  compareText: { color: colors.accent, ...TYPE.caption, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
