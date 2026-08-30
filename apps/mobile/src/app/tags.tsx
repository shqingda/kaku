import { useEffect, useMemo, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import {
  getSubjectTypeFromSlug,
  getSubjectTypeLabel,
  getSubjectTypeSlug,
} from '@/features/catalog/subject-types';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { SubjectSearchField } from '@/features/shared/subject-search-field';
import { useTheme } from '@/features/theme/theme-provider';
import type { PublicTag } from '@/features/tags/model';
import { useGlobalTags } from '@/features/tags/use-global-tags';

const compactNumber = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 1,
  notation: 'compact',
});

export default function TagsScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { type } = useLocalSearchParams<{ type?: string }>();
  const [subjectType, setSubjectType] = useState<number>(() =>
    getSubjectTypeFromSlug(type));
  // 路由参数变化时同步本地状态（页面被复用时不重新初始化 useState）。
  useEffect(() => {
    const next = getSubjectTypeFromSlug(type);
    if (next !== subjectType) {
      setSubjectType(next);
    }
  }, [subjectType, type]);
  const [draft, setDraft] = useState('');
  const tagsQuery = useGlobalTags(subjectType);
  const items = useMemo(
    () => tagsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [tagsQuery.data],
  );

  function browseTag(tag = draft) {
    const normalized = tag.trim();
    if (!normalized) return;
    Keyboard.dismiss();
    router.push({
      pathname: '/browse',
      params: { tag: normalized, type: getSubjectTypeSlug(subjectType) },
    });
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '标签索引' }} />
      <FlatList
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        data={items}
        key={subjectType}
        keyExtractor={(item) => item.name}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <TagState
            error={tagsQuery.isError}
            loading={tagsQuery.isPending}
            onRetry={() => void tagsQuery.refetch()}
          />
        }
        ListFooterComponent={items.length ? (
          <PagedListFooter
            hasNextPage={Boolean(tagsQuery.hasNextPage)}
            isError={tagsQuery.isFetchNextPageError}
            isFetching={tagsQuery.isFetchingNextPage}
            loadedCount={items.length}
            onRetry={() => void tagsQuery.fetchNextPage()}
          />
        ) : null}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <Text style={styles.title}>标签索引</Text>
              <Text style={styles.subtitle}>从常用标签发现感兴趣的条目</Text>
            </View>
            <SubjectTypeTabs
              contentContainerStyle={styles.tabs}
              onChange={setSubjectType}
              selectedType={subjectType}
            />
            <SubjectSearchField
              accessibilityLabel="按标签浏览"
              onChangeText={setDraft}
              onSubmit={() => browseTag()}
              placeholder="输入标签，如 科幻"
              style={styles.search}
              value={draft}
            />
            <Text style={styles.sectionTitle}>
              {getSubjectTypeLabel(subjectType)}标签
            </Text>
          </View>
        }
        numColumns={2}
        onEndReached={() => {
          if (
            tagsQuery.hasNextPage &&
            !tagsQuery.isFetchingNextPage &&
            !tagsQuery.isFetchNextPageError
          ) {
            void tagsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        refreshControl={
          <AppRefreshControl
            onRefresh={() => void tagsQuery.refetch()}
            refreshing={tagsQuery.isRefetching && !tagsQuery.isPending}
          />
        }
        renderItem={({ item }) => (
          <TagCard item={item} onPress={() => browseTag(item.name)} styles={styles} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function TagCard({ item, onPress, styles }: {
  item: PublicTag;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityLabel={`${item.name}，${item.count} 个条目`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tag, pressed && styles.pressed]}
    >
      <Text numberOfLines={1} style={styles.tagName}>{item.name}</Text>
      <Text style={styles.tagCount}>{compactNumber.format(item.count)}</Text>
    </Pressable>
  );
}

function TagState({ error, loading, onRetry }: {
  error: boolean;
  loading: boolean;
  onRetry: () => void;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>
        {loading ? '正在读取标签' : error ? '标签加载失败' : '暂无标签'}
      </Text>
      <Text style={styles.stateText}>
        {error ? 'Bangumi 偶尔会响应较慢，请稍后重试。' : '换一种条目类型看看。'}
      </Text>
      {error ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retry,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 44, paddingHorizontal: 20 },
  row: { gap: 10 },
  hero: { paddingHorizontal: 4, paddingTop: 24 },
  title: { color: colors.ink, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 7 },
  tabs: { paddingBottom: 2, paddingTop: 20 },
  search: { marginTop: 14 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: 14, marginTop: 28 },
  tag: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderCurve: 'continuous',
    borderRadius: 16,
    flex: 1,
    flexDirection: 'row',
    height: 54,
    justifyContent: 'space-between',
    marginBottom: 10,
    maxWidth: '49%',
    paddingHorizontal: 15,
  },
  tagName: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: '700' },
  tagCount: { color: colors.subtle, fontSize: 11, marginLeft: 8 },
  state: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, padding: 34, width: '100%' },
  stateTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  stateText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: 'center' },
  retry: { backgroundColor: colors.accentSoft, borderRadius: 13, marginTop: 14, minHeight: 44, paddingHorizontal: 17, justifyContent: 'center' },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
