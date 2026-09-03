import { memo, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { getSubjectDetailLabels } from '@/features/catalog/subject-types';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import type { StaffCredit } from '@/features/staff/model';
import { useSubjectStaff } from '@/features/staff/use-subject-staff';
import { useTheme } from '@/features/theme/theme-provider';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

const COLLAPSED_COUNT = 3;
const ROLE_PRIORITY = [
  '原作',
  '导演',
  '监督',
  '系列构成',
  '脚本',
  '人物设定',
  '总作画监督',
  '作画监督',
  '原画',
  '演出',
  '分镜',
  '动画制作',
  '制片人',
  '动画制片人',
  '音乐',
];

type StaffSection = {
  data: StaffCredit[];
  hiddenCount: number;
  role: string;
  totalCount: number;
};

function useThemedStyles() {
  const colors = useTheme();
  const styles = createStyles(colors);

  return { colors, styles };
}

function groupStaff(
  credits: StaffCredit[],
  expandedRoles: Set<string>,
): StaffSection[] {
  const groups = new Map<string, StaffCredit[]>();

  for (const credit of credits) {
    const current = groups.get(credit.role) ?? [];
    current.push(credit);
    groups.set(credit.role, current);
  }

  return [...groups.entries()]
    .sort(([leftRole], [rightRole]) => {
      const leftPriority = ROLE_PRIORITY.indexOf(leftRole);
      const rightPriority = ROLE_PRIORITY.indexOf(rightRole);

      if (leftPriority !== -1 || rightPriority !== -1) {
        return (
          (leftPriority === -1 ? ROLE_PRIORITY.length : leftPriority) -
          (rightPriority === -1 ? ROLE_PRIORITY.length : rightPriority)
        );
      }

      return leftRole.localeCompare(rightRole, 'zh-CN');
    })
    .map(([role, items]) => {
      const isExpanded = expandedRoles.has(role);
      const data = isExpanded ? items : items.slice(0, COLLAPSED_COUNT);

      return {
        data,
        hiddenCount: items.length - data.length,
        role,
        totalCount: items.length,
      };
    });
}

function StaffAvatar({
  item,
  withZoom,
}: {
  item: StaffCredit;
  withZoom: boolean;
}) {
  const { styles } = useThemedStyles();
  const avatar = (
    <View style={styles.avatar}>
      <Text style={styles.avatarFallback}>{item.name.slice(0, 1)}</Text>
      {item.imageUrl ? (
        <Image
          contentFit="cover"
          recyclingKey={item.imageUrl}
          source={item.imageUrl}
          style={StyleSheet.absoluteFill}
          transition={120}
        />
      ) : null}
    </View>
  );

  return withZoom ? <Link.AppleZoom>{avatar}</Link.AppleZoom> : avatar;
}

const StaffRow = memo(function StaffRow({ item }: { item: StaffCredit }) {
  const { colors, styles } = useThemedStyles();
  const content = (
    <>
      <StaffAvatar item={item} withZoom />
      <View style={styles.staffMain}>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.staffName}>
          {item.name}
        </Text>
        <Text style={styles.staffType}>
          {item.isOrganization ? '机构' : '人物'}
        </Text>
      </View>
      {item.episodeInfo ? (
        <View style={styles.episodeBadge}>
          <Text style={styles.episodeBadgeText}>EP.{item.episodeInfo}</Text>
        </View>
      ) : null}
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
    </>
  );

  // 机构在 Bangumi 与人物共用同一编号空间，直接复用人物详情页。
  return (
    <Link
      asChild
      href={{
        pathname: '/person/[id]',
        params: { id: String(item.id) },
      }}
    >
      <Pressable
        accessibilityLabel={`查看${item.isOrganization ? '机构' : '人物'} ${item.name}`}
        accessibilityRole="button"
        style={styles.staffRow}
      >
        {content}
      </Pressable>
    </Link>
  );
});

function renderStaffRow({ item }: { item: StaffCredit }) {
  return <StaffRow item={item} />;
}

export default function StaffScreen() {
  const { styles } = useThemedStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = parsePositiveIntegerRouteParam(id);
  const staffQuery = useSubjectStaff(subjectId ?? 0);
  const subjectQuery = useCatalogSubject(subjectId ?? 0);
  const labels = getSubjectDetailLabels(subjectQuery.data?.type ?? 2);
  const title = labels.credits.label;
  const pageTitle = labels.credits.pageTitle;
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(
    () => new Set(),
  );
  const sections = useMemo(
    () => groupStaff(staffQuery.data ?? [], expandedRoles),
    [expandedRoles, staffQuery.data],
  );

  function toggleRole(role: string) {
    setExpandedRoles((current) => {
      const next = new Set(current);

      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }

      return next;
    });
  }

  if (!subjectId) {
    return <InvalidRouteState message="这个制作人员链接缺少有效条目编号。" />;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerShown: true,
          headerShadowVisible: false,
          title,
        }}
      />
      {staffQuery.isPending ? (
        <View style={styles.state}>
          <Text style={styles.stateTitle}>正在读取{title}</Text>
          <Text style={styles.stateText}>名单较长，请稍候。</Text>
        </View>
      ) : staffQuery.isError && !staffQuery.data ? (
        <View style={styles.state}>
          <Text style={styles.stateTitle}>{title}读取失败</Text>
          <Text style={styles.stateText}>网络恢复后可以重新获取。</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void staffQuery.refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          contentContainerStyle={styles.content}
          initialNumToRender={16}
          keyExtractor={(item, index) =>
            `${item.role}-${item.id}-${item.episodeInfo ?? 'all'}-${index}`
          }
          ListEmptyComponent={
            <View style={styles.state}>
              <Text style={styles.stateTitle}>暂无制作人员资料</Text>
              <Text style={styles.stateText}>Bangumi 尚未收录这部分信息。</Text>
            </View>
          }
          ListHeaderComponent={
            <>
              {staffQuery.isError ? (
                <CachedDataNotice onRetry={() => void staffQuery.refetch()} />
              ) : null}
              <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>{pageTitle}</Text>
                <Text style={styles.pageMeta}>
                  {staffQuery.data?.length ?? 0} 条记录 · 按职位分组
                </Text>
              </View>
            </>
          }
          maxToRenderPerBatch={24}
          removeClippedSubviews={false}
          onRefresh={() =>
            void Promise.all([staffQuery.refetch(), subjectQuery.refetch()])
          }
          refreshing={
            (staffQuery.isRefetching || subjectQuery.isRefetching) &&
            !staffQuery.isPending
          }
          renderItem={renderStaffRow}
          renderSectionFooter={({ section }) =>
            section.totalCount > COLLAPSED_COUNT ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => toggleRole(section.role)}
                style={({ pressed }) => [
                  styles.expandButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.expandText}>
                  {section.hiddenCount > 0
                    ? `展开其余 ${section.hiddenCount} 条`
                    : '收起'}
                </Text>
              </Pressable>
            ) : null
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.role}</Text>
              <Text style={styles.sectionCount}>{section.totalCount}</Text>
            </View>
          )}
          sections={sections}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
          windowSize={21}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 44, paddingHorizontal: 20 },
  pageHeader: { paddingBottom: 22, paddingTop: 14 },
  pageTitle: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  pageMeta: { color: colors.muted, fontSize: 13, marginTop: 6 },
  sectionHeader: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flexDirection: 'row',
    paddingBottom: 10,
    paddingTop: 18,
  },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  sectionCount: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  staffRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    flexDirection: 'row',
    marginBottom: 8,
    minHeight: 66,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 13,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  avatarFallback: { color: colors.subtle, fontSize: 15, fontWeight: '700' },
  staffMain: { flex: 1, marginLeft: 12 },
  staffName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  staffType: { color: colors.subtle, fontSize: 11, marginTop: 4 },
  episodeBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: 9,
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  episodeBadgeText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  expandButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    marginTop: 2,
    paddingVertical: 11,
  },
  expandText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.58 },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  stateTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  stateText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
});
