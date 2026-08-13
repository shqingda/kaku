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

import type { ThemeColors } from '@/constants/theme';
import { AppState } from '@/features/shared/app-state';
import { useTheme } from '@/features/theme/theme-provider';
import type { PublicWikiRevision } from '@/features/wiki/model';
import { useWikiRevisions } from '@/features/wiki/use-wiki-revisions';
import { formatActivityTime } from '@/lib/format-activity-time';

export default function WikiScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          revisionsQuery.isPending ? (
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
          </View>
        }
        maxToRenderPerBatch={12}
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
          <Text numberOfLines={2} style={styles.rowTitle}>{item.title}</Text>
          <Text numberOfLines={2} style={styles.note}>
            {item.note || '更新条目信息'}
          </Text>
          <Text numberOfLines={1} style={styles.rowMeta}>
            {item.author} · {formatActivityTime(item.editedAt)}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`查看“${item.title}”的修改对比`}
          accessibilityRole="link"
          hitSlop={8}
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
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  header: { paddingBottom: 18, paddingTop: 20 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
  rowCard: { backgroundColor: colors.surface, paddingHorizontal: 16 },
  firstRowCard: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  lastRowCard: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  row: { alignItems: 'center', flexDirection: 'row', minHeight: 112, paddingVertical: 16 },
  rowDivider: { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth },
  revisionIcon: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  rowMain: { flex: 1, marginLeft: 13, minWidth: 0 },
  rowTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', lineHeight: 21 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  rowMeta: { color: colors.subtle, fontSize: 11, marginTop: 7 },
  compare: { alignItems: 'center', backgroundColor: colors.background, borderRadius: 11, justifyContent: 'center', marginLeft: 10, minHeight: 44, paddingHorizontal: 11 },
  compareText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
