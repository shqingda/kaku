import { useState } from 'react';
import { router, Stack } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import { SUBJECT_TYPES } from '@/features/catalog/subject-types';
import { AppState } from '@/features/shared/app-state';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { useScrollToTopButton } from '@/features/shared/use-scroll-to-top-button';
import { PublicUserCollectionRow } from '@/features/users/public-user-collection-row';
import { useTheme } from '@/features/theme/theme-provider';
import { CollectionRowEditor } from './collection-row-editor';
import { useMyCollections } from './use-my-collections';
import { collectionSearchStorageKey, DEFAULT_COLLECTION_SEARCH, parseCollectionSearch, searchCollections, type CollectionSearchPreferences } from './collection-search';

const statuses = [
  { value: undefined, label: '全部状态' }, { value: 'wish', label: '想看 / 想读' },
  { value: 'doing', label: '进行中' }, { value: 'completed', label: '已完成' },
  { value: 'onHold', label: '搁置' }, { value: 'dropped', label: '抛弃' },
] as const;

export function MyCollectionsScreen({ userId, initialType, initialStatus }: { userId: number; initialType?: string; initialStatus?: string }) {
  const colors = useTheme();
  const key = collectionSearchStorageKey(userId);
  const [initial] = useState(() => {
    try { return { preferences: parseCollectionSearch(Storage.getItemSync(key)), error: '' }; }
    catch { return { preferences: DEFAULT_COLLECTION_SEARCH, error: '筛选偏好读取失败，本次使用默认条件' }; }
  });
  const [preferences, setPreferences] = useState<CollectionSearchPreferences>(() => ({
    ...initial.preferences,
    ...(initialType && SUBJECT_TYPES.some(type => type.id === Number(initialType)) ? { subjectType: Number(initialType) } : {}),
    ...(initialStatus && statuses.some(status => status.value === initialStatus) ? { status: initialStatus as CollectionSearchPreferences['status'] } : {}),
  }));
  const [storageError, setStorageError] = useState(initial.error);
  const list = useScrollToTopButton();
  const { query, items, total, complete } = useMyCollections();
  const results = searchCollections(items, preferences);
  const paused = query.fetchStatus === 'paused';
  const incomplete = !complete || query.isError;
  function persist(next: CollectionSearchPreferences) {
    try { Storage.setItemSync(key, JSON.stringify(next)); setStorageError(''); }
    catch { setStorageError('筛选偏好保存失败，本次选择仍然有效'); }
  }
  function change(update: Partial<CollectionSearchPreferences>) {
    const next = { ...preferences, ...update };
    setPreferences(next);
    persist(next);
    list.ref.current?.scrollToOffset({ offset: 0, animated: false });
  }
  function retry() {
    if (query.isFetchNextPageError) void query.fetchNextPage();
    else void query.refetch();
  }
  const message = paused ? '当前离线，恢复联网后继续读取'
    : query.isError ? '收藏读取失败，当前结果可能不完整'
    : query.isPending && items.length === 0 ? '正在读取完整收藏'
    : !complete && !query.hasNextPage && !query.isPending && !query.isFetching ? '收藏发生变化，请刷新以取得完整结果'
    : incomplete ? `已读取 ${items.length}/${total || '…'} 项，搜索结果尚不完整`
    : `已读取全部 ${total} 项 · 找到 ${results.length} 项`;

  return <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <Stack.Screen options={{ title: '我的收藏', headerBackButtonDisplayMode: 'minimal' }} />
    <FlatList ref={list.ref} data={results} keyExtractor={item => String(item.id)}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 44 }}
      initialNumToRender={12} windowSize={7} onScroll={list.handleScroll} scrollEventThrottle={80}
      onRefresh={() => void query.refetch()} refreshing={query.isRefetching && !query.isFetchingNextPage}
      ListHeaderComponent={<View style={{ gap: 14, paddingTop: 20, paddingBottom: 18 }}>
        <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 28, fontWeight: '700' }}>我的收藏</Text>
        <TextInput accessibilityLabel="搜索我的完整收藏" placeholder="搜索中文名或原名" placeholderTextColor={colors.subtle}
          value={preferences.keyword} onChangeText={keyword => change({ keyword })} clearButtonMode="while-editing"
          style={{ minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surface, color: colors.ink, fontSize: 16 }} />
        {preferences.keyword ? <Choice label="清空搜索" selected={false} onPress={() => change({ keyword: '' })} /> : null}
        <SubjectTypeTabs types={[{ id: 0, label: '全部类型' }, ...SUBJECT_TYPES]} selectedType={preferences.subjectType} onChange={subjectType => change({ subjectType })} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
          {statuses.map(status => <Choice key={status.value ?? 'all'} label={status.label} selected={preferences.status === status.value} onPress={() => change({ status: status.value })} />)}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Choice label="最近更新" selected={preferences.sort === 'updated'} onPress={() => change({ sort: 'updated' })} />
          <Choice label="名称排序" selected={preferences.sort === 'title'} onPress={() => change({ sort: 'title' })} />
        </View>
        <Text accessibilityRole={query.isError ? 'alert' : undefined} style={{ color: colors.muted, fontSize: 13 }}>{message}</Text>
        {query.isError || (!complete && !query.hasNextPage && !query.isPending && !query.isFetching) ? <Choice label="重试读取收藏" selected={false} onPress={retry} /> : null}
        {storageError ? <View><Text accessibilityRole="alert" style={{ color: colors.muted }}>{storageError}</Text><Choice label="重试保存偏好" selected={false} onPress={() => persist(preferences)} /></View> : null}
      </View>}
      ListEmptyComponent={
        query.isPending && items.length === 0 ? <AppState title="收藏加载中" text="正在读取完整收藏，搜索会覆盖全部条目。" />
        : incomplete || paused ? null
        : <AppState title="没有匹配的收藏" text="可以换个名称或减少筛选条件。" />
      }
      renderItem={({ item, index }) => <PublicUserCollectionRow item={item} hasDivider={index > 0}
        trailing={item.collectionStatus === 'doing' ? <CollectionRowEditor item={item} /> : undefined}
        onPress={() => { persist(preferences); router.push({ pathname: '/subject/[id]', params: { id: String(item.id) } }); }} />}
    />
    <ScrollToTopButton onPress={list.scrollToTop} visible={list.visible} />
  </SafeAreaView>;
}
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: selected ? colors.ink : colors.surface, opacity: pressed ? 0.6 : 1 })}>
    <Text style={{ color: selected ? colors.surface : colors.muted, fontSize: 13 }}>{label}</Text>
  </Pressable>;
}
