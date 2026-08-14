import { useMemo } from 'react';
import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { AppState } from '@/features/shared/app-state';
import { getSubjectDetailLabels } from '@/features/catalog/subject-types';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { useSubjectCharacters } from '@/features/subject-extras/use-subject-extras';
import { useTheme } from '@/features/theme/theme-provider';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function SubjectCharactersScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = parsePositiveIntegerRouteParam(id);
  const charactersQuery = useSubjectCharacters(subjectId ?? 0);
  const subjectQuery = useCatalogSubject(subjectId ?? 0);
  const labels = getSubjectDetailLabels(subjectQuery.data?.type ?? 2);
  const title = labels.characters?.label ?? '角色与人物';

  if (!subjectId) {
    return <InvalidRouteState message="这个角色名单链接缺少有效条目编号。" />;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title }} />
      {charactersQuery.isPending ? (
        <AppState title="正在读取角色资料" text={`${title}名单加载中。`} />
      ) : charactersQuery.isError && !charactersQuery.data ? (
        <AppState
          action={() => void charactersQuery.refetch()}
          title="角色资料读取失败"
          text="请检查网络后重试。"
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={charactersQuery.data}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            <AppState title="暂无角色资料" text="Bangumi 尚未收录角色信息。" />
          }
          ListHeaderComponent={
            <>
              {charactersQuery.isError ? (
                <CachedDataNotice
                  onRetry={() => void charactersQuery.refetch()}
                />
              ) : null}
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.meta}>
                  {charactersQuery.data.length} 个角色
                </Text>
              </View>
            </>
          }
          onRefresh={() =>
            void Promise.all([
              charactersQuery.refetch(),
              subjectQuery.refetch(),
            ])
          }
          refreshing={
            (charactersQuery.isRefetching || subjectQuery.isRefetching) &&
            !charactersQuery.isPending
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Link
                asChild
                href={{
                  pathname: '/character/[id]',
                  params: { id: String(item.id) },
                }}
              >
                <Pressable style={({ pressed }) => pressed && styles.pressed}>
                  <View style={styles.portrait}>
                    <Text style={styles.fallback}>{item.name.slice(0, 1)}</Text>
                    {item.imageUrl ? (
                      <Image
                        contentFit="cover"
                        contentPosition="top"
                        recyclingKey={item.imageUrl}
                        source={item.imageUrl}
                        style={StyleSheet.absoluteFill}
                        transition={140}
                      />
                    ) : null}
                  </View>
                </Pressable>
              </Link>
              <View style={styles.main}>
                <View style={styles.nameLine}>
                  <Link
                    asChild
                    href={{
                      pathname: '/character/[id]',
                      params: { id: String(item.id) },
                    }}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.nameButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        ellipsizeMode="tail"
                        numberOfLines={1}
                        style={styles.name}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  </Link>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{item.role}</Text>
                  </View>
                </View>
                <Text numberOfLines={2} style={styles.summary}>
                  {item.summary || '暂无角色简介'}
                </Text>
                {item.actors.length > 0 ? (
                  <View style={styles.actors}>
                    <Text style={styles.actorLabel}>CV · </Text>
                    {item.actors.map((actor, index) => (
                      <Link
                        asChild
                        href={{
                          pathname: '/person/[id]',
                          params: { id: String(actor.id) },
                        }}
                        key={actor.id}
                      >
                        <Pressable
                          style={({ pressed }) => pressed && styles.pressed}
                        >
                          <Text style={styles.actor}>
                            {index > 0 ? ' / ' : ''}
                            {actor.name}
                          </Text>
                        </Pressable>
                      </Link>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}


const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { gap: 12, paddingBottom: 44, paddingHorizontal: 20 },
  header: { paddingBottom: 10, paddingTop: 14 },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    flexDirection: 'row',
    minHeight: 158,
    padding: 12,
  },
  portrait: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    height: 134,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 92,
  },
  fallback: { color: colors.subtle, fontSize: 20, fontWeight: '700' },
  main: { flex: 1, justifyContent: 'center', marginLeft: 14, width: 0 },
  nameLine: { alignItems: 'center', flexDirection: 'row' },
  nameButton: { flex: 1, minWidth: 0, overflow: 'hidden' },
  name: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  roleBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: 9,
    flexShrink: 0,
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  roleText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  summary: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },
  actors: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 9,
  },
  actorLabel: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  actor: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.58 },
});
