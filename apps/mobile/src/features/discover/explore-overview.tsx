import { type ComponentProps } from 'react';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import {
  getSubjectTypeLabel,
  getSubjectTypeSlug,
} from '@/features/catalog/subject-types';
import { AppState } from '@/features/shared/app-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { SectionAction } from '@/features/shared/section-action';

import { exploreChannelMeta } from './explore-search';
import { useExploreStyles } from './explore-styles';
import type { CalendarDay, DiscoverSubject } from './model';
import { RankedSubjectRow } from './ranked-subject-row';

const STATIC_EXPLORE_ENTRIES = [
  {
    icon: {
      android: 'forum',
      ios: 'bubble.left.and.bubble.right',
      web: 'forum',
    },
    meta: '公开小组与最新话题',
    path: '/community',
    title: '社区',
  },
  {
    icon: { android: 'article', ios: 'doc.text', web: 'article' },
    meta: '最新公开长文与用户评论',
    path: '/blogs',
    title: '日志',
  },
  {
    icon: { android: 'list_alt', ios: 'list.bullet.rectangle', web: 'list_alt' },
    meta: '用户整理的主题收藏与推荐',
    path: '/directories',
    title: '目录',
  },
  {
    icon: { android: 'people_outline', ios: 'person.2', web: 'people_outline' },
    meta: '虚构角色与现实人物',
    path: '/people',
    title: '人物',
  },
  {
    icon: { android: 'label', ios: 'tag', web: 'label' },
    meta: '按标签浏览作品',
    path: '/tags',
    title: '标签',
  },
  {
    icon: { android: 'history_edu', ios: 'book', web: 'history_edu' },
    meta: '维基修订与更新记录',
    path: '/wiki',
    title: '维基',
  },
] as const;

export function ExploreOverviewBody({
  calendarDays,
  calendarError,
  calendarPending,
  hasCalendarData,
  onChangeDay,
  onChangeSearchType,
  onRetryCalendar,
  onRetryRanking,
  rankingError,
  rankingPending,
  rankedSubjects,
  selectedCalendarDay,
  selectedSearchType,
}: {
  calendarDays: CalendarDay[];
  calendarError: boolean;
  calendarPending: boolean;
  hasCalendarData: boolean;
  onChangeDay: (dayId: number) => void;
  onChangeSearchType: (subjectType: number) => void;
  onRetryCalendar: () => void;
  onRetryRanking: () => void;
  rankingError: boolean;
  rankingPending: boolean;
  rankedSubjects: DiscoverSubject[];
  selectedCalendarDay?: CalendarDay;
  selectedSearchType: number;
}) {
  const { styles } = useExploreStyles();

  return (
    <>
      <SubjectTypeTabs
        contentContainerStyle={styles.subjectTypeTabs}
        onChange={onChangeSearchType}
        selectedType={selectedSearchType}
      />
      <View>
        <ExploreEntries subjectType={selectedSearchType} />
        {selectedSearchType === 2 ? (
          <CalendarPreview
            days={calendarDays}
            hasData={hasCalendarData}
            isError={calendarError}
            isPending={calendarPending}
            onChangeDay={onChangeDay}
            onRetry={onRetryCalendar}
            selectedDay={selectedCalendarDay}
          />
        ) : null}
        <RankingSection
          isError={rankingError}
          isPending={rankingPending}
          onRetry={onRetryRanking}
          subjects={rankedSubjects}
          subjectType={selectedSearchType}
        />
      </View>
    </>
  );
}

function ExploreEntries({ subjectType }: { subjectType: number }) {
  const { styles } = useExploreStyles();

  return (
    <View style={styles.exploreEntries}>
      <ExploreEntry
        featured
        icon={{
          android: 'grid_view',
          ios: 'square.grid.2x2',
          web: 'grid_view',
        }}
        meta={exploreChannelMeta(subjectType)}
        onPress={() =>
          router.push({
            pathname: '/channel/[type]',
            params: { type: getSubjectTypeSlug(subjectType) },
          })
        }
        title="频道"
      />
      {STATIC_EXPLORE_ENTRIES.map((entry) => (
        <ExploreEntry
          icon={entry.icon}
          key={entry.title}
          meta={entry.meta}
          onPress={() => router.push(entry.path as Href)}
          title={entry.title}
        />
      ))}
    </View>
  );
}

function ExploreEntry({
  featured = false,
  icon,
  meta,
  onPress,
  title,
}: {
  featured?: boolean;
  icon: ComponentProps<typeof SymbolView>['name'];
  meta: string;
  onPress: () => void;
  title: string;
}) {
  const { colors, styles } = useExploreStyles();

  return (
    <Pressable
      accessibilityHint={`打开${title}`}
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.exploreEntry,
        featured && styles.exploreEntryFeatured,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.exploreEntryIcon}>
        <SymbolView name={icon} size={17} tintColor={colors.accent} />
      </View>
      <View style={styles.exploreEntryText}>
        <Text style={styles.exploreEntryTitle}>{title}</Text>
        {featured ? (
          <Text numberOfLines={1} style={styles.exploreEntryMeta}>
            {meta}
          </Text>
        ) : null}
      </View>
      <SymbolView
        name={{
          android: 'chevron_right',
          ios: 'chevron.right',
          web: 'chevron_right',
        }}
        size={13}
        tintColor={colors.subtle}
        weight="semibold"
      />
    </Pressable>
  );
}

function CalendarPreview({
  days,
  hasData,
  isError,
  isPending,
  onChangeDay,
  onRetry,
  selectedDay,
}: {
  days: CalendarDay[];
  hasData: boolean;
  isError: boolean;
  isPending: boolean;
  onChangeDay: (dayId: number) => void;
  onRetry: () => void;
  selectedDay?: CalendarDay;
}) {
  const { styles } = useExploreStyles();

  return (
    <>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>每日放送</Text>
          <Text style={styles.sectionMeta}>看看今天有哪些新节目</Text>
        </View>
        <SectionAction
          accessibilityLabel="查看全部每日放送"
          label="查看全部"
          onPress={() => router.push('/calendar')}
        />
      </View>
      {hasData && isError ? <CachedDataNotice onRetry={onRetry} /> : null}
      {isPending && !hasData ? (
        <AppState title="正在读取放送表" text="本周动画加载中。" />
      ) : isError && !hasData ? (
        <AppState
          action={onRetry}
          title="放送表读取失败"
          text="请检查网络后重试。"
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.dayTabs}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {days.map((day) => {
              const isSelected = day.id === selectedDay?.id;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={day.id}
                  onPress={() => onChangeDay(day.id)}
                  style={({ pressed }) => [
                    styles.dayTab,
                    isSelected && styles.dayTabSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayTabText,
                      isSelected && styles.dayTabTextSelected,
                    ]}
                  >
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <FlatList
            contentContainerStyle={styles.calendarList}
            data={selectedDay?.subjects ?? []}
            horizontal
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={
              <AppState title="今天暂无条目" text="放送表还没有相关数据。" />
            }
            renderItem={({ item }) => <CalendarCard item={item} />}
            showsHorizontalScrollIndicator={false}
          />
        </>
      )}
    </>
  );
}

function RankingSection({
  isError,
  isPending,
  onRetry,
  subjects,
  subjectType,
}: {
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
  subjects: DiscoverSubject[];
  subjectType: number;
}) {
  const { styles } = useExploreStyles();
  const subjectTypeLabel = getSubjectTypeLabel(subjectType);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{subjectTypeLabel}排行榜</Text>
          <Text style={styles.sectionMeta}>Bangumi 综合排名</Text>
        </View>
        <SectionAction
          accessibilityLabel={`查看全部${subjectTypeLabel}排行榜`}
          label="查看全部"
          onPress={() =>
            router.push({
              pathname: '/rankings',
              params: { type: String(subjectType) },
            })
          }
        />
      </View>
      {subjects.length > 0 && isError ? (
        <CachedDataNotice onRetry={onRetry} />
      ) : null}
      {isPending && subjects.length === 0 ? (
        <AppState
          title="正在读取排行榜"
          text={`高评分${subjectTypeLabel}加载中。`}
        />
      ) : isError && subjects.length === 0 ? (
        <AppState action={onRetry} title="排行榜读取失败" text="请稍后重试。" />
      ) : (
        <View style={styles.rankingList}>
          {subjects.slice(0, 6).map((item, index) => (
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
    </View>
  );
}

function CalendarCard({ item }: { item: DiscoverSubject }) {
  const { styles } = useExploreStyles();

  return (
    <Pressable
      accessibilityHint="打开条目详情"
      accessibilityLabel={`${item.title}，${item.score ? `${item.score.toFixed(1)} 分` : '暂无评分'}`}
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/subject/[id]',
          params: { id: String(item.id) },
        })
      }
      style={({ pressed }) => [styles.calendarCard, pressed && styles.pressed]}
    >
      <View style={styles.calendarCover}>
        <Text style={styles.coverFallback}>{item.title.slice(0, 1)}</Text>
        {item.coverUrl ? (
          <Image
            contentFit="cover"
            recyclingKey={item.coverUrl}
            source={item.coverUrl}
            style={StyleSheet.absoluteFill}
            transition={120}
          />
        ) : null}
      </View>
      <Text
        ellipsizeMode="tail"
        maxFontSizeMultiplier={1.35}
        numberOfLines={2}
        style={styles.calendarTitle}
      >
        {item.title}
      </Text>
      <Text style={styles.calendarMeta}>
        {item.score ? `${item.score.toFixed(1)} 分` : '暂无评分'}
      </Text>
    </Pressable>
  );
}
