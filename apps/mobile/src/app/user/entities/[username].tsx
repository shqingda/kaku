import { useMemo, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { useScrollToTopButton } from '@/features/shared/use-scroll-to-top-button';
import { useTheme } from '@/features/theme/theme-provider';
import type {
  PublicUserEntityCollection,
  PublicUserEntityKind,
} from '@/features/users/model';
import { PublicUserEntityCard } from '@/features/users/public-user-entity-card';
import { usePublicUserEntities } from '@/features/users/use-public-user';

const TABS: { kind: PublicUserEntityKind; label: string }[] = [
  { kind: 'character', label: '角色' },
  { kind: 'person', label: '人物' },
];

export default function PublicUserEntitiesScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { username } = useLocalSearchParams<{ username: string }>();
  const [kind, setKind] = useState<PublicUserEntityKind>('character');
  const listRef = useScrollToTopButton();
  const entitiesQuery = usePublicUserEntities(username, kind);
  const entities = entitiesQuery.data?.items ?? [];

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '角色与人物' }} />
      <FlatList
        ref={listRef.ref}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        data={entities}
        initialNumToRender={10}
        key={kind}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        ListEmptyComponent={
          entitiesQuery.isPending ? (
            <AppState text="正在读取公开收藏。" title="加载中" />
          ) : entitiesQuery.isError ? (
            <AppState
              action={() => void entitiesQuery.refetch()}
              text="网络暂时不可用，请稍后重试。"
              title="收藏读取失败"
            />
          ) : (
            <AppState
              text={`该用户没有公开收藏的${kind === 'character' ? '角色' : '人物'}。`}
              title="暂无收藏"
            />
          )
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>角色与人物</Text>
            <Text style={styles.meta}>
              @{username} · {entitiesQuery.data?.total ?? 0} 个公开收藏
            </Text>
            <View accessibilityRole="tablist" style={styles.tabs}>
              {TABS.map((tab) => {
                const selected = tab.kind === kind;
                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    key={tab.kind}
                    onPress={() => setKind(tab.kind)}
                    style={({ pressed }) => [
                      styles.tab,
                      selected && styles.selectedTab,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        selected && styles.selectedTabText,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {entities.length > 0 && entitiesQuery.isError ? (
              <CachedDataNotice onRetry={() => void entitiesQuery.refetch()} />
            ) : null}
          </View>
        }
        numColumns={2}
        onScroll={listRef.handleScroll}
        refreshControl={
          <AppRefreshControl
            onRefresh={() => void entitiesQuery.refetch()}
            refreshing={entitiesQuery.isRefetching}
          />
        }
        renderItem={({ item }) => (
          <PublicUserEntityCard
            entity={item}
            onPress={() =>
              router.push({
                pathname:
                  item.kind === 'character'
                    ? '/character/[id]'
                    : '/person/[id]',
                params: { id: String(item.id) },
              })
            }
          />
        )}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={80}
        windowSize={7}
      />
      <ScrollToTopButton
        onPress={listRef.scrollToTop}
        visible={listRef.visible}
      />
    </SafeAreaView>
  );
}


const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: {
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  row: { gap: 12, marginBottom: 12 },
  header: { paddingBottom: 20, paddingHorizontal: 4, paddingTop: 18 },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
  tabs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
    marginTop: 18,
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 78,
    paddingHorizontal: 16,
  },
  selectedTab: { backgroundColor: colors.ink },
  tabText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  selectedTabText: { color: colors.surface },
  pressed: { opacity: 0.62 },
});
