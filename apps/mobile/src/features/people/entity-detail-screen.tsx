import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { FullscreenImageViewer } from '@/features/shared/fullscreen-image-viewer';
import { HeaderShareButton } from '@/features/shared/header-share-button';
import { useTheme } from '@/features/theme/theme-provider';

import { EntityComments } from './entity-comments';
import {
  buildEntityListItems,
  EntityRelationRow,
} from './entity-relation-list';
import type { PublicEntityDetail } from './model';

export function EntityDetailScreen({
  data,
  initialReplyId,
  isError,
  isPending,
  isRefreshing,
  kind,
  onRetry,
}: {
  data?: PublicEntityDetail;
  initialReplyId?: string;
  isError: boolean;
  isPending: boolean;
  isRefreshing: boolean;
  kind: '人物' | '角色';
  onRetry: () => void;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const [portraitVisible, setPortraitVisible] = useState(false);
  const entityKind = kind === '角色' ? 'character' : 'person';
  const entityId = data?.id ?? 0;
  const items = useMemo(() => {
    if (!data) return [];
    return buildEntityListItems(data, kind);
  }, [data, kind]);

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          title: data?.name ?? `${kind}详情`,
          headerRight: () =>
            data ? (
              <HeaderShareButton
                path={`/${entityKind}/${entityId}`}
                title={data.name}
              />
            ) : null,
        }}
      />
      {isPending ? (
        <AppState text={`正在读取${kind}资料。`} title="加载中" />
      ) : isError || !data ? (
        <AppState
          action={onRetry}
          text="请检查网络后重试。"
          title={`${kind}资料读取失败`}
        />
      ) : (
        <EntityComments
          commentCount={data.commentCount}
          entityId={data.id}
          entityKind={entityKind}
          initialReplyId={initialReplyId}
          kind={kind}
          name={data.name}
        >
          {(preview) => (
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
                      <Text style={styles.fallback}>
                        {data.name.slice(0, 1)}
                      </Text>
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
                      <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.kind}>
                        {(data.categoryLabels ?? [kind]).join(' · ')}
                      </Text>
                      <Text style={styles.stats}>
                        {(data.collectionCount ?? 0).toLocaleString('zh-CN')}{' '}
                        人收藏
                        {' · '}
                        {(data.commentCount ?? 0).toLocaleString('zh-CN')} 条评论
                      </Text>
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

                  {preview}
                </>
              }
              refreshControl={
                <AppRefreshControl
                  onRefresh={onRetry}
                  refreshing={isRefreshing}
                />
              }
              renderItem={({ item }) => (
                <EntityRelationRow item={item} kind={kind} />
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </EntityComments>
      )}
      <FullscreenImageViewer
        onClose={() => setPortraitVisible(false)}
        title={data?.name ?? kind}
        url={data?.imageUrl}
        visible={portraitVisible}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
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
      backgroundColor: colors.track,
      borderRadius: 22,
      height: 154,
      justifyContent: 'center',
      overflow: 'hidden',
      width: 112,
    },
    fallback: { color: colors.subtle, fontSize: 24, fontWeight: '800' },
    heroMain: { flex: 1, marginLeft: 20 },
    name: {
      color: colors.ink,
      fontSize: 27,
      fontWeight: '800',
      letterSpacing: -0.6,
      lineHeight: 34,
    },
    kind: { color: colors.muted, fontSize: 13, marginTop: 8 },
    stats: { color: colors.subtle, fontSize: 11, marginTop: 6 },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      marginTop: 4,
      padding: 18,
    },
    panelTitle: {
      color: colors.ink,
      fontSize: 17,
      fontWeight: '800',
      marginBottom: 12,
    },
    summary: { color: colors.muted, fontSize: 14, lineHeight: 23 },
    metadataRow: {
      flexDirection: 'row',
      paddingVertical: 10,
    },
    rowBorder: {
      borderTopColor: colors.divider,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    metadataLabel: { color: colors.subtle, fontSize: 13, width: 78 },
    metadataValue: {
      color: colors.ink,
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
    },
    pressed: { opacity: 0.62 },
  });
