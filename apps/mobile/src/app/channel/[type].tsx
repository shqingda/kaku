import { useState, type ComponentProps } from 'react';
import { Image } from 'expo-image';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import {
  getSubjectTypeFromSlug,
  getSubjectTypeLabel,
  getSubjectTypeSlug,
} from '@/features/catalog/subject-types';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import type { ChannelSubject } from '@/features/channels/model';
import { useChannel } from '@/features/channels/use-channel';
import { RankedSubjectRow } from '@/features/discover/ranked-subject-row';
import { useBangumiRankedSubjects } from '@/features/discover/use-discover';

const CHANNEL_TYPES = [
  { id: 2, label: '动画' },
  { id: 1, label: '书籍' },
  { id: 3, label: '音乐' },
  { id: 4, label: '游戏' },
  { id: 6, label: '三次元' },
] as const;

export default function ChannelScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const [subjectType, setSubjectType] = useState<number>(() => getSubjectTypeFromSlug(type));
  const label = subjectType === 1 ? '阅读' : getSubjectTypeLabel(subjectType);
  const channelQuery = useChannel(subjectType);
  const rankingQuery = useBangumiRankedSubjects(subjectType);
  const ranked = rankingQuery.data?.pages[0]?.items.slice(0, 6) ?? [];

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: `${label}频道` }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>KAKU CHANNEL</Text>
          <Text style={styles.title}>{label}频道</Text>
          <Text style={styles.subtitle}>最近关注、口碑作品与常用入口</Text>
        </View>
        <SubjectTypeTabs
          contentContainerStyle={styles.typeTabs}
          onChange={setSubjectType}
          selectedType={subjectType}
          types={CHANNEL_TYPES}
        />

        <SectionHeading
          meta="根据最近 30 日关注"
          title="近期热门"
        />
        {channelQuery.isPending ? (
          <ChannelState title="正在读取热门条目" text={`${label}频道加载中。`} />
        ) : channelQuery.isError ? (
          <ChannelState
            action={() => void channelQuery.refetch()}
            title="热门条目读取失败"
            text="Bangumi 偶尔会响应较慢，稍后重试即可。"
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.hotList}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {channelQuery.data.items.map((item) => (
              <ChannelCard item={item} key={item.id} />
            ))}
          </ScrollView>
        )}

        <SectionHeading meta="快速前往常用功能" title="继续探索" />
        <View style={styles.actions}>
          <ChannelAction
            icon={{ android: 'leaderboard', ios: 'chart.bar', web: 'leaderboard' }}
            label="排行榜"
            onPress={() =>
              router.push({
                pathname: '/rankings',
                params: { type: String(subjectType) },
              })
            }
          />
          <ChannelAction
            icon={{ android: 'local_offer', ios: 'tag', web: 'local_offer' }}
            label="标签索引"
            onPress={() =>
              router.push({
                pathname: '/tags',
                params: { type: getSubjectTypeSlug(subjectType) },
              })
            }
          />
          <ChannelAction
            icon={{ android: 'filter_alt', ios: 'line.3.horizontal.decrease', web: 'filter_alt' }}
            label="分类浏览"
            onPress={() =>
              router.push({
                pathname: '/browse',
                params: { type: getSubjectTypeSlug(subjectType) },
              })
            }
          />
          {subjectType === 2 ? (
            <ChannelAction
              icon={{ android: 'calendar_month', ios: 'calendar', web: 'calendar_month' }}
              label="每日放送"
              onPress={() => router.push('/calendar')}
            />
          ) : null}
        </View>

        <View style={styles.rankingHeading}>
          <SectionHeading meta="Bangumi 综合排名" title="高分精选" />
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/rankings',
                params: { type: String(subjectType) },
              })
            }
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.allText}>全部 ›</Text>
          </Pressable>
        </View>
        {rankingQuery.isPending ? (
          <ChannelState title="正在读取高分条目" text="排行榜加载中。" />
        ) : rankingQuery.isError ? (
          <ChannelState
            action={() => void rankingQuery.refetch()}
            title="高分条目读取失败"
            text="已经显示的热门内容不会受影响。"
          />
        ) : (
          <View style={styles.rankingList}>
            {ranked.map((item, index) => (
              <RankedSubjectRow
                hasDivider={index > 0}
                item={item}
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: '/subject/[id]',
                    params: { id: String(item.id) },
                  })
                }
                position={index + 1}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChannelCard({ item }: { item: ChannelSubject }) {
  return (
    <View style={styles.hotCard}>
      <Link
        asChild
        href={{ pathname: '/subject/[id]', params: { id: String(item.id) } }}
      >
        <Pressable style={({ pressed }) => pressed && styles.pressed}>
          <Link.AppleZoom>
            <View style={styles.cover}>
              <Text style={styles.coverFallback}>{item.title.slice(0, 1)}</Text>
              {item.coverUrl ? (
                <Image
                  contentFit="cover"
                  source={item.coverUrl}
                  style={StyleSheet.absoluteFill}
                  transition={120}
                />
              ) : null}
            </View>
          </Link.AppleZoom>
          <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
          <Text numberOfLines={1} style={styles.cardMeta}>
            {item.attentionCount !== undefined
              ? `${item.attentionCount} 人关注`
              : item.score
                ? `${item.score.toFixed(1)} 分`
                : '近期热门'}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

function ChannelAction({ icon, label, onPress }: {
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>
        <SymbolView name={icon} size={18} tintColor={COLORS.accent} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function SectionHeading({ meta, title }: { meta: string; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionMeta}>{meta}</Text>
    </View>
  );
}

function ChannelState({ action, text, title }: {
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
  content: { paddingBottom: 52, paddingHorizontal: 20 },
  hero: { paddingHorizontal: 4, paddingTop: 24 },
  eyebrow: { color: COLORS.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: COLORS.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 7 },
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 8 },
  typeTabs: { paddingBottom: 2, paddingTop: 22 },
  sectionHeading: { paddingHorizontal: 4, paddingTop: 30 },
  sectionTitle: { color: COLORS.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  sectionMeta: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  hotList: { gap: 14, paddingRight: 20, paddingTop: 16 },
  hotCard: { width: 126 },
  cover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 18,
    height: 175,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 126,
  },
  coverFallback: { color: COLORS.subtle, fontSize: 20, fontWeight: '700' },
  cardTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '700', height: 40, lineHeight: 19, marginTop: 9 },
  cardMeta: { color: COLORS.subtle, fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 16 },
  action: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    flexBasis: '47%',
    flexGrow: 1,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 13,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  actionLabel: { color: COLORS.ink, fontSize: 13, fontWeight: '700', marginTop: 9 },
  rankingHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  allText: { color: COLORS.accent, fontSize: 13, fontWeight: '700', paddingBottom: 3, paddingHorizontal: 4, paddingVertical: 8 },
  rankingList: { backgroundColor: COLORS.surface, borderRadius: 22, marginTop: 16, overflow: 'hidden', paddingHorizontal: 16 },
  state: { alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 22, marginTop: 16, padding: 30 },
  stateTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  stateText: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginTop: 6, textAlign: 'center' },
  retry: { backgroundColor: COLORS.accentSoft, borderRadius: 13, marginTop: 14, paddingHorizontal: 17, paddingVertical: 9 },
  retryText: { color: COLORS.accent, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
